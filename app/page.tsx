import { db } from "@/lib/db";
import { siteConfig } from "@/lib/site";
import { ProductCard } from "@/components/product-card";

export const metadata = {
  title: "Catalog",
};

export default async function CatalogPage() {
  const products = await db.product.findMany({
    include: { images: { orderBy: { position: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{siteConfig.name}</h1>
        <p className="mt-1 text-neutral-500">{siteConfig.tagline}</p>
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 py-24 text-center text-neutral-400">
          No products yet. Check back soon!
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              title={product.title}
              priceCents={product.priceCents}
              images={product.images}
            />
          ))}
        </div>
      )}
    </div>
  );
}