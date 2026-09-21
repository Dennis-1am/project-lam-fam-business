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
  if (!raw) return 0;
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

function parseTranslationModes(
  formData: FormData,
): Record<string, { title?: "auto" | "manual"; description?: "auto" | "manual" }> {
  const out: Record<string, { title?: "auto" | "manual"; description?: "auto" | "manual" }> = {};
  for (const [key, value] of formData.entries()) {
    const match = /^translationModes\[([a-z]{2})\]\[(title|description)\]$/.exec(key);
    if (!match) continue;
    const [, lang, field] = match;
    if (!isSupportedLanguage(lang)) continue;
    if (value !== "auto" && value !== "manual") continue;
    out[lang] ??= {};
    out[lang][field as "title" | "description"] = value;
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

async function deleteImageIfUnused(url: string) {
  const references = await db.image.count({ where: { url } });
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

  const product = await db.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        priceCents,
        sourceLanguage,
        tagId,
        images: {
          create: images.map((img, position) => ({ ...img, position })),
        },
      },
    });

    await tx.productTranslation.create({
      data: {
        productId: created.id,
        language: sourceLanguage,
        title,
        description: description ?? "",
        titleManual: true,
        descriptionManual: true,
      },
    });

    return created;
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

  const existing = await db.product.findUnique({
    where: { id: productId },
    include: { images: true },
  });

  if (!existing) {
    throw new Error("Product not found.");
  }

  const sourceLanguage = parseSourceLanguage(formData.get("sourceLanguage"), existing.sourceLanguage as Language);
  const rebase = sourceLanguage !== existing.sourceLanguage;

  // The form loads its main fields from the (post-swap) source language's real
  // row, so edits are detected against that row. A pure language swap only
  // re-targets the form and flips the pointer — no translations are touched.
  const currentSourceRow = await db.productTranslation.findUnique({
    where: { productId_language: { productId, language: sourceLanguage } },
  });
  const titleEdited = title !== (currentSourceRow?.title ?? "");
  const descriptionEdited = description !== (currentSourceRow?.description ?? "");
  const lightSwap = rebase && !titleEdited && !descriptionEdited;

  const existingUrls = new Set(existing.images.map((img) => img.url));
  const keptUrls = new Set(imageUrls);

  const cropByUrl = new Map(images.map((img) => [img.url, img]));
  const kept = existing.images.filter((img) => keptUrls.has(img.url));
  await db.$transaction([
    db.image.deleteMany({
      where: {
        productId,
        NOT: { url: { in: [...keptUrls] } },
      },
    }),
    db.product.update({
      where: { id: productId },
      data: { sourceLanguage, priceCents, tagId },
    }),
    // Following the source-language flip, the previously authored cell is
    // protected: it shows as Manual so auto-translation never overwrites it.
    ...(rebase
      ? [
          db.productTranslation.updateMany({
            where: { productId, language: existing.sourceLanguage as Language },
            data: { titleManual: true, descriptionManual: true },
          }),
        ]
      : []),
    db.productTranslation.upsert({
      where: {
        productId_language: { productId, language: sourceLanguage },
      },
      update: { title, description, titleManual: true, descriptionManual: true },
      create: {
        productId,
        language: sourceLanguage,
        title,
        description: description ?? "",
        titleManual: true,
        descriptionManual: true,
      },
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

  // The dropped image rows are gone (committed above), so a reference count
  // here can only see other products — unlink the file only when none exist.
  // Running the unlink after commit keeps a failed save from ever producing a
  // product that points at a deleted file.
  for (const image of existing.images) {
    if (!keptUrls.has(image.url)) {
      await deleteImageIfUnused(image.url);
    }
  }

  // A pure swap (language changed, nothing edited) only re-targets the form
  // and flips the pointer — no API calls, no translation writes, no flag churn.
  if (!lightSwap) {
    // If the source description was cleared, drop the now-stale translated
    // descriptions so shoppers never see text for a field that no longer
    // exists. Manually authored translations are spared.
    if (descriptionEdited && !description) {
      await db.productTranslation.updateMany({
        where: { productId, description: { not: "" }, descriptionManual: false },
        data: { description: "", descriptionManual: false },
      });
    }

    const translations = parseTranslations(formData);
    const modes = parseTranslationModes(formData);

    // Best-effort automated translation: quota walls and errors never block the
    // product save. Only fields whose source text actually changed are sent to
    // the API, and only when their per-field toggle is "auto". Fields marked
    // "manual" are left untouched.
    await autoTranslateChangedFields({
      productId,
      source: sourceLanguage,
      fields: {
        title: { text: title, changed: titleEdited },
        description: description ? { text: description, changed: descriptionEdited } : null,
      },
      fillMissing: true,
      modes,
    });

    // Persist manual overrides for fields whose toggle is "manual".
    for (const [lang, fields] of Object.entries(modes)) {
      if (!isSupportedLanguage(lang)) continue;
      if (fields.title !== "manual" && fields.description !== "manual") continue;
      const submitted = translations[lang];
      const updateData: Record<string, unknown> = {
        ...(fields.title === "manual"
          ? { title: submitted?.title ?? "", titleManual: true }
          : {}),
        ...(fields.description === "manual"
          ? { description: submitted?.description ?? "", descriptionManual: true }
          : {}),
      };
      await db.productTranslation.upsert({
        where: {
          productId_language: { productId, language: lang },
        },
        update: updateData,
        create: {
          productId,
          language: lang,
          title: fields.title === "manual" ? submitted?.title ?? "" : "",
          description: fields.description === "manual" ? submitted?.description ?? "" : "",
          titleManual: fields.title === "manual",
          descriptionManual: fields.description === "manual",
        },
      });
    }

    // Keep the stored manual flags in sync with the submitted toggles: a field
    // flipped back to "auto" loses its manual flag immediately (without waiting
    // for a translation), so the toggle stays as the user left it.
    const titleAutoLangs = Object.entries(modes)
      .filter(([, f]) => f.title === "auto")
      .map(([lang]) => lang);
    const descriptionAutoLangs = Object.entries(modes)
      .filter(([, f]) => f.description === "auto")
      .map(([lang]) => lang);

    if (titleAutoLangs.length > 0) {
      await db.productTranslation.updateMany({
        where: { productId, language: { in: titleAutoLangs }, titleManual: true },
        data: { titleManual: false },
      });
    }
    if (descriptionAutoLangs.length > 0) {
      await db.productTranslation.updateMany({
        where: { productId, language: { in: descriptionAutoLangs }, descriptionManual: true },
        data: { descriptionManual: false },
      });
    }
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

  const images = product.images;
  await db.product.delete({ where: { id: productId } });

  // Product rows are gone, so the count below sees only other products.
  for (const image of images) {
    await deleteImageIfUnused(image.url);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin");
}