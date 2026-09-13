import { db } from "@/lib/db";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { AddProductTile } from "@/components/add-product-tile";
import { cookies } from "next/headers";

export const metadata = {
  title: "Catalog",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const requestedPage = Number(pageParam);
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const skip = (page - 1) * PAGE_SIZE;

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admin_session")?.value;
  const isAdmin = !!sessionCookie;

  const [productsWithExtra, total] = await Promise.all([
    db.product.findMany({
      include: { tag: true, images: { orderBy: { position: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE + 1,
    }),
    db.product.count(),
  ]);

  const hasMore = productsWithExtra.length > PAGE_SIZE;
  const products = productsWithExtra.slice(0, PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="pb-10 pt-6">
        <p className="text-sm font-medium uppercase tracking-widest text-neutral-400">
          Family wholesale · Since 2010
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          Welcome to our shop
        </h1>
        {total > 0 && (
          <p className="mt-2 text-neutral-500">
            {total} {total === 1 ? "product" : "products"}
          </p>
        )}
      </section>

      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {isAdmin && page === 1 && <AddProductTile />}
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            id={product.id}
            title={product.title}
            priceCents={product.priceCents}
            images={product.images}
            tag={product.tag}
            isAdmin={isAdmin}
            priority={page === 1 && index === 0}
          />
        ))}
      </div>
      {products.length === 0 && (
        <div className="rounded-xl border border-dashed border-neutral-300 py-24 text-center text-neutral-400">
          No products yet. Check back soon!
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-12 flex items-center justify-center gap-4 text-sm">
          {page > 1 ? (
            <Link
              href={page === 2 ? "/" : `/?page=${page - 1}`}
              className="rounded-lg border border-neutral-300 px-4 py-2 transition hover:border-neutral-900"
            >
              Previous
            </Link>
          ) : (
            <span className="px-4 py-2 text-neutral-300">Previous</span>
          )}
          <span className="text-neutral-500">
            Page {page} of {totalPages}
          </span>
          {hasMore ? (
            <Link
              href={`/?page=${page + 1}`}
              className="rounded-lg border border-neutral-300 px-4 py-2 transition hover:border-neutral-900"
            >
              Next
            </Link>
          ) : (
            <span className="px-4 py-2 text-neutral-300">Next</span>
          )}
        </nav>
      )}
    </div>
  );
}