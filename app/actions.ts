"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteUploadFile } from "@/lib/storage";
import { autoTranslateChangedFields } from "@/lib/translate";
import { isSupportedLanguage, stripMarkup } from "@/lib/languages";
import type { Language } from "@/lib/translations";

function parsePrice(input: FormDataEntryValue | null): number {
  const raw = String(input ?? "").trim();
  const value = parseFloat(raw);
  if (Number.isNaN(value) || value < 0) {
    throw new Error("Please enter a valid price.");
  }
  return Math.round(value * 100);
}

function parseTitle(input: FormDataEntryValue | null): string {
  const title = String(input ?? "").trim();
  if (!title) {
    throw new Error("Please enter a product title.");
  }
  return title;
}

function parseSourceLanguage(
  input: FormDataEntryValue | null,
  fallback: Language = "en",
): Language {
  const raw = String(input ?? "").trim().toLowerCase();
  return isSupportedLanguage(raw) ? raw : fallback;
}

function parseTranslations(formData: FormData): Record<string, { title?: string; description?: string }> {
  const out: Record<string, { title?: string; description?: string }> = {};
  for (const [key, value] of formData.entries()) {
    const match = /^translations\[([a-z]{2})\]\[(title|description)\]$/.exec(key);
    if (!match) continue;
    const [, lang, field] = match;
    if (!isSupportedLanguage(lang)) continue;
    out[lang] ??= {};
    out[lang][field as "title" | "description"] = String(value).trim();
  }
  return out;
}

function sanitizeCrop(
  xRaw: string,
  yRaw: string,
  wRaw: string,
  hRaw: string,
): { cropX: number; cropY: number; cropWidth: number; cropHeight: number } | null {
  const x = parseFloat(xRaw);
  const y = parseFloat(yRaw);
  const w = parseFloat(wRaw);
  const h = parseFloat(hRaw);
  if (![x, y, w, h].every(Number.isFinite)) return null;
  if (w <= 0 || h <= 0 || x < 0 || y < 0) return null;
  return { cropX: x, cropY: y, cropWidth: w, cropHeight: h };
}

function parseImageEntries(formData: FormData) {
  const urls = formData.getAll("imageUrls").map((u) => String(u));
  const cropX = formData.getAll("cropX").map((v) => String(v));
  const cropY = formData.getAll("cropY").map((v) => String(v));
  const cropW = formData.getAll("cropWidth").map((v) => String(v));
  const cropH = formData.getAll("cropHeight").map((v) => String(v));

  return urls
    .map((url, i) => ({
      url,
      ...(sanitizeCrop(cropX[i] ?? "", cropY[i] ?? "", cropW[i] ?? "", cropH[i] ?? "") ?? {}),
    }))
    .filter((img) => img.url !== "");
}

async function deleteImageIfUnused(url: string, excludeProductId?: string) {
  const references = await db.image.count({
    where: {
      url,
      ...(excludeProductId ? { productId: { not: excludeProductId } } : {}),
    },
  });
  if (references === 0) {
    await deleteUploadFile(url);
  }
}

export async function createProduct(formData: FormData) {
  await requireAdmin();

  const title = stripMarkup(parseTitle(formData.get("title")));
  const priceCents = parsePrice(formData.get("price"));
  const description = stripMarkup(String(formData.get("description") ?? "")).trim();
  const sourceLanguage = parseSourceLanguage(formData.get("sourceLanguage"));
  const images = parseImageEntries(formData);
  const tagId = String(formData.get("tagId") ?? "").trim() || null;
  if (tagId) {
    const tag = await db.tag.findUnique({
      where: { id: tagId },
      select: { id: true },
    });
    if (!tag) {
      throw new Error("Selected tag no longer exists.");
    }
  }

  const product = await db.product.create({
    data: {
      title,
      priceCents,
      description,
      sourceLanguage,
      tagId,
      images: {
        create: images.map((img, position) => ({ ...img, position })),
      },
    },
  });

  await autoTranslateChangedFields({
    productId: product.id,
    source: sourceLanguage,
    fields: {
      title: { text: title, changed: true },
      description: description ? { text: description, changed: true } : null,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  redirect(`/admin/${product.id}/edit`);
}

export async function updateProduct(formData: FormData) {
  await requireAdmin();

  const productId = String(formData.get("id") ?? "");
  if (!productId) {
    throw new Error("Missing product id.");
  }

  const title = stripMarkup(parseTitle(formData.get("title")));
  const priceCents = parsePrice(formData.get("price"));
  const description = stripMarkup(String(formData.get("description") ?? "")).trim();
  const images = parseImageEntries(formData);
  const imageUrls = images.map((img) => img.url);

  const existing = await db.product.findUnique({
    where: { id: productId },
    include: { images: true, translations: true },
  });

  if (!existing) {
    throw new Error("Product not found.");
  }

  const sourceLanguage = parseSourceLanguage(formData.get("sourceLanguage"), existing.sourceLanguage as Language);

  const existingUrls = new Set(existing.images.map((img) => img.url));
  const keptUrls = new Set(imageUrls);

  for (const image of existing.images) {
    if (!keptUrls.has(image.url)) {
      await deleteImageIfUnused(image.url, productId);
    }
  }
  await db.image.deleteMany({
    where: {
      productId,
      NOT: { url: { in: [...keptUrls] } },
    },
  });

  const cropByUrl = new Map(images.map((img) => [img.url, img]));
  const kept = existing.images.filter((img) => keptUrls.has(img.url));
  await db.$transaction([
    db.product.update({
      where: { id: productId },
      data: { title, sourceLanguage, priceCents, description },
    }),
    ...kept.map((image) => {
      const crop = cropByUrl.get(image.url);
      return db.image.update({
        where: { id: image.id },
        data: {
          position: imageUrls.indexOf(image.url),
          cropX: crop?.cropX ?? null,
          cropY: crop?.cropY ?? null,
          cropWidth: crop?.cropWidth ?? null,
          cropHeight: crop?.cropHeight ?? null,
        },
      });
    }),
    ...images
      .filter((img) => !existingUrls.has(img.url))
      .map((img, index) =>
        db.image.create({
          data: {
            url: img.url,
            productId,
            position: kept.length + index,
            cropX: img.cropX ?? null,
            cropY: img.cropY ?? null,
            cropWidth: img.cropWidth ?? null,
            cropHeight: img.cropHeight ?? null,
          },
        }),
      ),
  ]);

  // If the source description was cleared, drop the now-stale translated
  // descriptions so shoppers never see text for a field that no longer exists.
  if (!description) {
    await db.productTranslation.updateMany({
      where: { productId, description: { not: "" } },
      data: { description: "", descriptionManual: false },
    });
  }

  const translations = parseTranslations(formData);

  // Detect manual edits by comparing what the admin submitted against the
  // stored values from before this round of auto-translation. Any field the
  // admin changed here is treated as a manual override and wins over
  // re-generated text.
  const manualEdits: Record<string, { title?: boolean; description?: boolean }> = {};
  for (const [lang, submitted] of Object.entries(translations)) {
    const row = existing.translations.find((t) => t.language === lang);
    const edits: { title?: boolean; description?: boolean } = {};
    if (submitted.title !== undefined && submitted.title !== (row?.title ?? "")) {
      edits.title = true;
    }
    if (
      submitted.description !== undefined &&
      submitted.description !== (row?.description ?? "")
    ) {
      edits.description = true;
    }
    if (Object.keys(edits).length > 0) {
      manualEdits[lang] = edits;
    }
  }

  const sourceChanged = sourceLanguage !== existing.sourceLanguage;
  const titleChanged = title !== existing.title;
  const descriptionChanged = description !== existing.description;
  const retranslateTitle = sourceChanged || titleChanged;
  const retranslateDescription = sourceChanged || descriptionChanged;

  // Best-effort automated translation: quota walls and errors never block the
  // product save. Only per-field differences are sent to the API.
  await autoTranslateChangedFields({
    productId,
    source: sourceLanguage,
    fields: {
      title: { text: title, changed: retranslateTitle },
      description: description ? { text: description, changed: retranslateDescription } : null,
    },
    fillMissing: true,
    manualEdits,
  });

  // Persist manual overrides for the fields the admin edited.
  // Uses upsert keyed on the composite unique constraint so a row created by
  // autoTranslateChangedFields in the same save is updated rather than
  // duplicated (P2002 guard).
  for (const [lang, edits] of Object.entries(manualEdits)) {
    if (!isSupportedLanguage(lang)) continue;
    const submitted = translations[lang]!;
    const updateData: Record<string, unknown> = {};
    if (edits.title !== undefined) {
      updateData.title = submitted.title ?? "";
      updateData.titleManual = true;
    }
    if (edits.description !== undefined) {
      updateData.description = submitted.description ?? "";
      updateData.descriptionManual = true;
    }
    await db.productTranslation.upsert({
      where: {
        productId_language: { productId, language: lang },
      },
      update: updateData,
      create: {
        productId,
        language: lang,
        title: edits.title !== undefined ? submitted.title ?? "" : "",
        description: edits.description !== undefined ? submitted.description ?? "" : "",
        titleManual: edits.title !== undefined,
        descriptionManual: edits.description !== undefined,
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/product/[id]", "page");
  revalidatePath("/admin");
  redirect(`/admin/${productId}/edit`);
}

export async function deleteProduct(formData: FormData) {
  await requireAdmin();

  const productId = String(formData.get("id") ?? "");
  if (!productId) {
    throw new Error("Missing product id.");
  }

  const product = await db.product.findUnique({
    where: { id: productId },
    include: { images: true },
  });

  if (!product) {
    throw new Error("Product not found.");
  }

  for (const image of product.images) {
    await deleteImageIfUnused(image.url, productId);
  }
  await db.product.delete({ where: { id: productId } });

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin");
}