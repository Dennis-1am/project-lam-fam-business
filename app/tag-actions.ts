"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { TAG_NAME_MAX_LENGTH } from "@/lib/tags";

function validateTagName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Tag name is required.");
  }
  if (trimmed.length > TAG_NAME_MAX_LENGTH) {
    throw new Error(`Tag name must be ${TAG_NAME_MAX_LENGTH} characters or fewer.`);
  }
  return trimmed;
}

function ensureProduct(productId: string) {
  if (!productId) {
    throw new Error("Missing product id.");
  }
}

async function findCaseInsensitive(name: string) {
  const lower = name.toLowerCase();
  const tags = await db.tag.findMany({ select: { id: true, name: true } });
  return tags.find((tag) => tag.name.toLowerCase() === lower) ?? null;
}

async function getOrCreateTag(name: string) {
  const tagName = validateTagName(name);
  let tag = await findCaseInsensitive(tagName);
  if (!tag) {
    tag = await db.tag.create({ data: { name: tagName } });
  }
  return tag;
}

export async function createTag(name: string) {
  await requireAdmin();
  const tag = await getOrCreateTag(name);

  revalidatePath("/");

  return { tagId: tag.id, name: tag.name };
}

export async function assignProductTag(productId: string, tagId: string | null) {
  await requireAdmin();
  ensureProduct(productId);

  await db.product.update({
    where: { id: productId },
    data: { tagId },
  });

  revalidatePath("/");
  revalidatePath(`/product/${productId}`);
}

export async function createTagAndAssign(productId: string, name: string) {
  await requireAdmin();
  ensureProduct(productId);

  const tag = await getOrCreateTag(name);

  await db.product.update({
    where: { id: productId },
    data: { tagId: tag.id },
  });

  revalidatePath("/");
  revalidatePath(`/product/${productId}`);

  return { tagId: tag.id, name: tag.name };
}

export async function deleteTag(tagId: string) {
  await requireAdmin();
  if (!tagId) {
    throw new Error("Missing tag id.");
  }

  await db.tag.delete({ where: { id: tagId } });

  revalidatePath("/");
}