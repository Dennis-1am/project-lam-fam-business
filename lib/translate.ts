import { db } from "@/lib/db";
import type { Language } from "@/lib/translations";
import { targetLanguages } from "@/lib/languages";

class QuotaExceededError extends Error {}

const DAILY_LIMIT = (() => {
  const raw = Number(process.env.TRANSLATE_DAILY_LIMIT);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 16000;
})();

const TRANSLATE_ENDPOINT =
  process.env.TRANSLATE_ENDPOINT ??
  "https://translation.googleapis.com/language/translate/v2";

function getApiKey(): string | null {
  const key = process.env.GOOGLE_CLOUD_TRANSLATE_API_KEY?.trim();
  if (!key || /replace/i.test(key)) return null;
  return key;
}

function pacificDateKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function charCount(text: string): number {
  return [...text].length;
}

// Serialize quota charging so concurrent saves cannot overshoot the daily
// budget. Charges are reserved before each API call; if Google itself rejects
// a request for its own quota, we leave the reserved count in place (safe
// against under-counting, at worst deferring the product to the next day).
let quotaQueue: Promise<boolean> = Promise.resolve(true);

function chargeChars(chars: number): Promise<boolean> {
  quotaQueue = quotaQueue.then(async () => {
    const date = pacificDateKey();
    let row = await db.translationQuota.findUnique({ where: { id: 1 } });
    if (!row || row.date !== date) {
      row = await db.translationQuota.upsert({
        where: { id: 1 },
        update: { date, usedChars: 0 },
        create: { id: 1, date, usedChars: 0 },
      });
    }
    if (row.usedChars + chars > DAILY_LIMIT) return false;
    const updated = await db.translationQuota.update({
      where: { id: 1 },
      data: { usedChars: { increment: chars } },
    });
    return updated.usedChars <= DAILY_LIMIT;
  }).catch(() => false);
  return quotaQueue;
}

async function translateText(
  text: string,
  source: Language,
  target: Language,
): Promise<string | null> {
  const apiKey = getApiKey();
  const chars = charCount(text);
  if (!apiKey || chars === 0) return null;
  if (!(await chargeChars(chars))) throw new QuotaExceededError();

  const response = await fetch(
    `${TRANSLATE_ENDPOINT}?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        ...(process.env.TRANSLATE_REFERER
          ? { Referer: process.env.TRANSLATE_REFERER }
          : {}),
      },
      body: JSON.stringify({ q: [text], source, target, format: "text" }),
      signal: AbortSignal.timeout(15000),
    },
  );

  const body = (await response.json().catch(() => null)) as {
    error?: { status?: string; message?: string };
    data?: { translations?: Array<{ translatedText?: string }> };
  } | null;

  if (!response.ok) {
    const message = body?.error?.message ?? "";
    const status = body?.error?.status ?? "";
    const isQuota =
      response.status === 429 ||
      /quota|rate.?limit|ratelimit|dailylimit|resourceexhausted/i.test(
        `${message} ${status}`,
      );
    if (isQuota) throw new QuotaExceededError();
    throw new Error(
      `Translation request failed (${response.status}): ${message || "unknown error"}`,
    );
  }

  return body?.data?.translations?.[0]?.translatedText ?? null;
}

async function safeTranslateField(params: {
  productId: string;
  language: Language;
  field: "title" | "description";
  text: string;
  source: Language;
}): Promise<void> {
  try {
    const translated = await translateText(params.text, params.source, params.language);
    if (translated === null) return;

    const existing = await db.productTranslation.findUnique({
      where: {
        productId_language: { productId: params.productId, language: params.language },
      },
    });

    const data =
      params.field === "title"
        ? { title: translated }
        : { description: translated };

    if (existing) {
      await db.productTranslation.update({ where: { id: existing.id }, data });
    } else {
      await db.productTranslation.create({
        data: {
          productId: params.productId,
          language: params.language,
          title: params.field === "title" ? translated : "",
          description: params.field === "description" ? translated : "",
        },
      });
    }
  } catch (error) {
    if (!(error instanceof QuotaExceededError)) {
      console.error("Product translation failed:", error);
    }
  }
}

/**
 * Translates source fields into every target language.
 *
 * Each `fields` entry carries `{ text, changed }` — when `changed` is true the
 * field is sent to the API even if a translation already exists. When
 * `fillMissing` is on, an empty or missing translation is filled regardless of
 * whether the source changed, so a re-save after quota-wall expiry regenerates
 * it.
 *
 * Fields that are already manually overridden (or freshly edited in the same
 * submission, via `manualEdits`) are left untouched.
 */
export async function autoTranslateChangedFields(params: {
  productId: string;
  source: Language;
  fields: {
    title: { text: string; changed: boolean } | null;
    description: { text: string; changed: boolean } | null;
  };
  fillMissing?: boolean;
  manualEdits?: Record<string, { title?: boolean; description?: boolean }>;
}): Promise<void> {
  for (const language of targetLanguages(params.source)) {
    const existing = await db.productTranslation.findUnique({
      where: {
        productId_language: { productId: params.productId, language },
      },
    });

    const edited = params.manualEdits?.[language];

    if (params.fields.title) {
      const titleExists = existing !== null && existing.title !== "";
      const shouldTranslate =
        params.fields.title.changed || (params.fillMissing && !titleExists);

      if (shouldTranslate && !(existing?.titleManual ?? false) && !edited?.title) {
        await safeTranslateField({
          productId: params.productId,
          language,
          field: "title",
          text: params.fields.title.text,
          source: params.source,
        });
      }
    }

    if (params.fields.description) {
      const descExists = existing !== null && existing.description !== "";
      const shouldTranslate =
        params.fields.description.changed || (params.fillMissing && !descExists);

      if (shouldTranslate && !(existing?.descriptionManual ?? false) && !edited?.description) {
        await safeTranslateField({
          productId: params.productId,
          language,
          field: "description",
          text: params.fields.description.text,
          source: params.source,
        });
      }
    }
  }
}