import { readFile } from "node:fs/promises";
import path from "node:path";
import { contentTypeForFilename, NAME_PATTERN, UPLOADS_DIR } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;

  if (!NAME_PATTERN.test(name)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const buffer = await readFile(path.join(UPLOADS_DIR, name));
    return new Response(buffer, {
      headers: {
        "Content-Type": contentTypeForFilename(name) ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
}