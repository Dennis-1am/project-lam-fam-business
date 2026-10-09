"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteUploadFile, IMAGE_URL_PREFIX, NAME_PATTERN } from "@/lib/storage";
import { stripMarkup, SUPPORTED_LANGUAGES } from "@/lib/languages";
import { MIN_ASPECT } from "@/lib/crop";
import { autoTranslateSiteBannerText } from "@/lib/translate";
import { BANNER_SINGLETON_ID, BANNER_TAG } from "@/lib/site-banner";
import type { Language } from "@/lib/translations";

const MAX_CROP = 100;
const MAX_TEXT = 120;

function parseCropPercent(raw: FormDataEntryValue | null): number | null {
  if (raw == null) return null;
  const value = Number(String(raw));
  if (!Number.isFinite(value)) return null;
  return Math.min(MAX_CROP, Math.max(0, value));
}

/**
 * The cropper's frame ratio. A value the client could not produce (0, missing,
 * or garbage) comes back as `null` rather than being clamped to the legal floor
 * — the floor is a real ratio a cropped photo may have, so clamping invented
 * one. `cropFromRecord` falls back to a square for a null it cannot use.
 */
function parseAspect(raw: FormDataEntryValue | null): number | null {
  const value = Number(String(raw ?? ""));
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.min(10, Math.max(MIN_ASPECT, value));
}

function parseDimension(raw: FormDataEntryValue | null): number | null {
  const value = Number(String(raw ?? ""));
  if (!Number.isFinite(value) || value <= 0 || value > 20000) return null;
  return Math.round(value);
}

type ImageFields = {
  imageUrl: string | null;
  cropX: number | null;
  cropY: number | null;
  cropWidth: number | null;
  cropHeight: number | null;
  cropAspect: number | null;
  imageWidth: number | null;
  imageHeight: number | null;
};

/**
 * A cropped rectangle is only meaningful when it actually narrows the photo.
 * The editor sends the whole rectangle for "I haven't cropped anything yet", so
 * keeping it would store a crop the admin never asked for — and taking its
 * `cropAspect` of 0 and clamping it to the floor produced a phantom tall-sliver
 * crop. Store nothing instead and the renderer falls back to the full image.
 */
function isFullFrame(x: number, y: number, width: number, height: number): boolean {
  return x === 0 && y === 0 && width === 100 && height === 100;
}

/**
 * Validates the image the admin chose. An empty URL clears the banner image;
 * anything else must be a real upload — the URL is attacker-controlled, and
 * `/api/images/[name]` only ever serves names matching `NAME_PATTERN`, so
 * storing anything else would save a link that 404s. The crop is only kept when
 * it describes a usable region of that image, otherwise it is dropped so the
 * renderer falls back to showing the whole photo.
 */
function parseImage(formData: FormData): { ok: true; value: ImageFields } | { ok: false; error: string } {
  const url = String(formData.get("imageUrl") ?? "").trim();
  const cleared: ImageFields = {
    imageUrl: null,
    cropX: null,
    cropY: null,
    cropWidth: null,
    cropHeight: null,
    cropAspect: null,
    imageWidth: null,
    imageHeight: null,
  };
  if (!url) return { ok: true, value: cleared };
  const filename = url.startsWith(IMAGE_URL_PREFIX) ? url.slice(IMAGE_URL_PREFIX.length) : "";
  if (!filename || !NAME_PATTERN.test(filename)) {
    return { ok: false, error: "Please choose an uploaded image." };
  }

  const cropX = parseCropPercent(formData.get("cropX"));
  const cropY = parseCropPercent(formData.get("cropY"));
  const cropWidth = parseCropPercent(formData.get("cropWidth"));
  const cropHeight = parseCropPercent(formData.get("cropHeight"));
  const hasCrop =
    cropX != null &&
    cropY != null &&
    cropWidth != null &&
    cropHeight != null &&
    cropWidth > 0 &&
    cropHeight > 0 &&
    !isFullFrame(cropX, cropY, cropWidth, cropHeight);

  return {
    ok: true,
    value: {
      imageUrl: url,
      cropX: hasCrop ? cropX : null,
      cropY: hasCrop ? cropY : null,
      cropWidth: hasCrop ? cropWidth : null,
      cropHeight: hasCrop ? cropHeight : null,
      cropAspect: hasCrop ? parseAspect(formData.get("cropAspect")) : null,
      imageWidth: parseDimension(formData.get("imageWidth")),
      imageHeight: parseDimension(formData.get("imageHeight")),
    },
  };
}

/**
 * Reads the single text field for each language the editor submitted. Missing
 * languages are skipped rather than blanked, so saving in English cannot wipe a
 * Spanish translation the admin already wrote.
 */
function parseText(formData: FormData): Partial<Record<Language, string>> {
  const text: Partial<Record<Language, string>> = {};
  for (const language of SUPPORTED_LANGUAGES) {
    if (!formData.has(`text[${language}]`)) continue;
    text[language] = stripMarkup(String(formData.get(`text[${language}]`) ?? "")).slice(0, MAX_TEXT);
  }
  return text;
}

/** The per-language Manual/Auto choice, mirroring the product editor's toggles. */
function parseModes(formData: FormData): Partial<Record<Language, "auto" | "manual">> {
  const modes: Partial<Record<Language, "auto" | "manual">> = {};
  for (const language of SUPPORTED_LANGUAGES) {
    const raw = String(formData.get(`translationModes[${language}]`) ?? "");
    if (raw === "auto" || raw === "manual") modes[language] = raw;
  }
  return modes;
}

function parseSourceLanguage(raw: FormDataEntryValue | null, fallback: Language): Language {
  const value = String(raw ?? "");
  return value === "es" || value === "zh" || value === "en" ? value : fallback;
}

type SaveSiteBannerResult = { ok: true } | { ok: false; error: string };

export async function saveSiteBanner(formData: FormData): Promise<SaveSiteBannerResult> {
  await requireAdmin();

  const parsed = parseImage(formData);
  if (!parsed.ok) return parsed;
  const image = parsed.value;

  const previous = await db.siteBanner.findUnique({
    where: { id: BANNER_SINGLETON_ID },
    select: {
      imageUrl: true,
      sourceLanguage: true,
      translations: { select: { language: true, text: true } },
    },
  });

  const sourceLanguage = parseSourceLanguage(
    formData.get("sourceLanguage"),
    (previous?.sourceLanguage as Language) ?? "en",
  );
  const texts = parseText(formData);
  const modes = parseModes(formData);

  const existingSource =
    previous?.translations.find((entry) => entry.language === sourceLanguage)?.text ?? "";
  const sourceText = texts[sourceLanguage] ?? existingSource;
  const sourceChanged = sourceText !== existingSource;

  // The banner row must exist before its translations: the translation's
  // foreign key is enforced on insert, so writing translations first failed
  // every save on a fresh database.
  await db.$transaction(async (tx) => {
    await tx.siteBanner.upsert({
      where: { id: BANNER_SINGLETON_ID },
      create: { id: BANNER_SINGLETON_ID, sourceLanguage, ...image },
      update: { sourceLanguage, ...image },
    });

    // The source row is authored verbatim and is never overwritten by
    // translation, so it is always manual.
    await tx.siteBannerTranslation.upsert({
      where: { bannerId_language: { bannerId: BANNER_SINGLETON_ID, language: sourceLanguage } },
      create: {
        bannerId: BANNER_SINGLETON_ID,
        language: sourceLanguage,
        text: sourceText,
        textManual: true,
      },
      update: { text: sourceText, textManual: true },
    });

    for (const language of SUPPORTED_LANGUAGES) {
      if (language === sourceLanguage) continue;
      const mode = modes[language];
      if (mode === "manual") {
        await tx.siteBannerTranslation.upsert({
          where: { bannerId_language: { bannerId: BANNER_SINGLETON_ID, language } },
          create: {
            bannerId: BANNER_SINGLETON_ID,
            language,
            text: texts[language] ?? "",
            textManual: true,
          },
          update: { text: texts[language] ?? "", textManual: true },
        });
      } else if (mode === "auto") {
        // Let the translation pass refresh this row; keep any existing text.
        await tx.siteBannerTranslation.updateMany({
          where: { bannerId: BANNER_SINGLETON_ID, language },
          data: { textManual: false },
        });
      }
    }

    // Clearing the authored text means "no overlay", so stale auto translations
    // must go too. Manual ones are deliberately preserved.
    if (sourceChanged && sourceText === "") {
      await tx.siteBannerTranslation.updateMany({
        where: {
          bannerId: BANNER_SINGLETON_ID,
          language: { not: sourceLanguage },
          textManual: false,
        },
        data: { text: "" },
      });
    }
  });

  // Runs outside the transaction because each Google call is independent and
  // quota failures are swallowed per language, exactly like products.
  await autoTranslateSiteBannerText({
    bannerId: BANNER_SINGLETON_ID,
    source: sourceLanguage,
    text: sourceText,
    changed: sourceChanged,
    fillMissing: true,
    modes,
  });

  // Only remove the file we are actually replacing. The banner has no `Image`
  // rows, so the reference-counted helper used for products would delete a
  // file this very save is still pointing at.
  if (previous?.imageUrl && previous.imageUrl !== image.imageUrl) {
    await deleteUploadFile(previous.imageUrl);
  }

  revalidatePath("/");
  revalidateTag(BANNER_TAG, "max");

  return { ok: true };
}
