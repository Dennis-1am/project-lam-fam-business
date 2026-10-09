import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");
/** The path `app/api/images/[name]` is served from; stored URLs are this plus a filename. */
export const IMAGE_URL_PREFIX = "/api/images/";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Formats an admin may upload. Raster only: the server has no SVG sanitizer, so
 * accepting SVG here would let an upload carry script that runs same-origin.
 */
const UPLOAD_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

/**
 * Formats `app/api/images/[name]` will serve. A superset of the upload formats:
 * the seed scripts write SVG placeholders into `UPLOADS_DIR` directly (bypassing
 * `saveUpload`), and the catalog links to them, so dropping SVG here would 404
 * every seeded image. Only files this app itself wrote are reachable, since the
 * route only serves names matching `NAME_PATTERN` out of `UPLOADS_DIR`.
 */
const SERVED_CONTENT_TYPES: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(UPLOAD_EXTENSIONS).map(([type, extension]) => [extension, type]),
  ),
  svg: "image/svg+xml",
};

const ALLOWED_TYPES = new Set(Object.keys(UPLOAD_EXTENSIONS));

/**
 * The exact filename shape this app writes. `app/api/images/[name]` matches on
 * it before touching the filesystem, and the server actions match it before
 * storing a URL, so the two can never disagree about what is a real file.
 * Derived from `SERVED_CONTENT_TYPES`, so a new format only has to be added there.
 */
export const NAME_PATTERN = new RegExp(
  `^\\d+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(${Object.keys(SERVED_CONTENT_TYPES).join("|")})$`,
);

/** The `Content-Type` for a stored file, or null when the name is not one. */
export function contentTypeForFilename(name: string): string | null {
  return SERVED_CONTENT_TYPES[name.split(".").pop() ?? ""] ?? null;
}

export async function saveUpload(file: File): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File is too large (max 10MB)");
  }

  const ext = UPLOAD_EXTENSIONS[file.type] ?? "bin";
  const filename = `${Date.now()}-${randomUUID()}.${ext}`;

  await mkdir(UPLOADS_DIR, { recursive: true });
  await writeFile(path.join(UPLOADS_DIR, filename), Buffer.from(await file.arrayBuffer()));

  return `${IMAGE_URL_PREFIX}${filename}`;
}

export async function deleteUploadFile(url: string): Promise<void> {
  if (!url.startsWith(IMAGE_URL_PREFIX)) return;
  const filename = url.slice(IMAGE_URL_PREFIX.length);
  if (filename.includes("/") || filename.includes("..")) return;

  try {
    await unlink(path.join(UPLOADS_DIR, filename));
  } catch {
    // File already gone; nothing to do.
  }
}