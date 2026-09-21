import { db } from "@/lib/db";
import { assembleProduct } from "@/lib/product-i18n";

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;

function parsePositiveInt(raw: string | null, fallback: number): number {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parsePositiveInt(searchParams.get("page"), 1);
  const pageSize = Math.min(
    parsePositiveInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE,
  );

  const [items, total] = await Promise.all([
    db.product.findMany({
      include: {
        images: { orderBy: { position: "asc" } },
        translations: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.product.count(),
  ]);

  return Response.json({
    items: items.map(assembleProduct),
    page,
    pageSize,
    total,
    hasMore: page * pageSize < total,
  });
}