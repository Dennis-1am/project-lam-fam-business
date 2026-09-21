import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export async function saveUpload(file: File): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File is too large (max 10MB)");
  }

  const ext = EXTENSIONS[file.type] ?? "bin";
  const filename = `${Date.now()}-${randomUUID()}.${ext}`;

  await mkdir(UPLOADS_DIR, { recursive: true });
  await writeFile(path.join(UPLOADS_DIR, filename), Buffer.from(await file.arrayBuffer()));

  return `/api/images/${filename}`;
}

export async function deleteUploadFile(url: string): Promise<void> {
  if (!url.startsWith("/api/images/")) return;
  const filename = url.replace("/api/images/", "");
  if (filename.includes("/") || filename.includes("..")) return;

  try {
    await unlink(path.join(UPLOADS_DIR, filename));
  } catch {
    // File already gone; nothing to do.
  }
}