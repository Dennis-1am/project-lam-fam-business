import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/site";
import { ProductGallery } from "@/components/product-gallery";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const product = await db.product.findUnique({
    where: { id },
    include: { images: { orderBy: { position: "asc" } } },
  });

  if (!product) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-6 text-sm text-neutral-500">
        <Link href="/" className="hover:text-neutral-900">
          Catalog
        </Link>
        <span className="mx-2">/</span>
        <span className="text-neutral-900">{product.title}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery images={product.images} />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{product.title}</h1>
          <p className="mt-2 text-2xl font-semibold text-neutral-800">
            {formatPrice(product.priceCents)}
          </p>
          {product.description && (
            <p className="mt-6 whitespace-pre-line leading-relaxed text-neutral-600">
              {product.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}