import { db } from "@/lib/db";
import { assembleProduct } from "@/lib/product-i18n";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const product = await db.product.findUnique({
    where: { id },
    include: {
      tag: true,
      images: { orderBy: { position: "asc" } },
      translations: true,
    },
  });

  if (!product) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(assembleProduct(product));
}