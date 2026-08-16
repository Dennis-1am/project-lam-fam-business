"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteUploadFile } from "@/lib/storage";

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

  const title = parseTitle(formData.get("title"));
  const priceCents = parsePrice(formData.get("price"));
  const description = String(formData.get("description") ?? "").trim();
  const images = parseImageEntries(formData);

  const product = await db.product.create({
    data: {
      title,
      priceCents,
      description,
      images: {
        create: images.map((img, position) => ({ ...img, position })),
      },
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

  const title = parseTitle(formData.get("title"));
  const priceCents = parsePrice(formData.get("price"));
  const description = String(formData.get("description") ?? "").trim();
  const images = parseImageEntries(formData);
  const imageUrls = images.map((img) => img.url);

  const existing = await db.product.findUnique({
    where: { id: productId },
    include: { images: true },
  });

  if (!existing) {
    throw new Error("Product not found.");
  }

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
      data: { title, priceCents, description },
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