import { db } from "@/lib/db";

export async function GET() {
  const items = await db.tag.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return Response.json({ items });
}