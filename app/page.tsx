import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { ProductCard } from "@/components/product-card";
import { AddProductTile } from "@/components/add-product-tile";
import { TagFilter } from "@/components/tag-filter";
import { getSession } from "@/lib/auth";
import { CatalogLocationMemory } from "@/components/catalog-location-memory";
import { CatalogHealthMessage, EmptyCatalogMessage, NoFilterResultsMessage } from "@/components/no-products-message";
import { assembleProduct } from "@/lib/product-i18n";

export const metadata = {
  title: "Catalog",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

const CATALOG_TAG = "products";
const CATALOG_TTL_SECONDS = 300;

type CatalogProductRow = Prisma.ProductGetPayload<{
  include: {
    tag: true;
    images: { orderBy: { position: "asc" }; take: 1 };
    translations: true;
  };
}>;

type CatalogProduct = CatalogProductRow & {
  title: string;
  description: string | null;
};

type CatalogResult = {
  total: number;
  totalPages: number;
  catalogTotal: number;
  products: CatalogProduct[];
  activeTag: { id: string; name: string } | null;
  hasMore: boolean;
};

const getCatalogData = unstable_cache(
  async ({
    rawPage,
    tagId,
    untagged,
  }: {
    rawPage: number;
    tagId: string | null;
    untagged: boolean;
  }): Promise<CatalogResult> => {
    const where: Prisma.ProductWhereInput = untagged
      ? { tagId: null }
      : tagId
        ? { tagId }
        : {};

    const [total, catalogTotal] = await Promise.all([
      db.product.count({ where }),
      db.product.count(),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.max(1, Math.min(rawPage, totalPages));
    const skip = (page - 1) * PAGE_SIZE;

    const productsWithExtra = await db.product.findMany({
      where,
      include: {
        tag: true,
        images: { orderBy: { position: "asc" }, take: 1 },
        translations: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE + 1,
    });

    const activeTag = tagId
      ? await db.tag.findUnique({
          where: { id: tagId },
          select: { id: true, name: true },
        })
      : null;

    return {
      total,
      totalPages,
      catalogTotal,
      products: productsWithExtra.slice(0, PAGE_SIZE).map(assembleProduct),
      activeTag,
      hasMore: productsWithExtra.length > PAGE_SIZE,
    };
  },
  ["catalog"],
  { tags: [CATALOG_TAG], revalidate: CATALOG_TTL_SECONDS },
);

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tag?: string; untagged?: string }>;
}) {
  const { page: pageParam, tag: tagParam, untagged: untaggedParam } =
    await searchParams;
  const rawPage = /^\d+$/.test(pageParam ?? "") ? Number(pageParam) : 1;

  const isAdmin = await getSession();
  const untagged = isAdmin && untaggedParam === "1";
  const tagId = !untagged && tagParam ? tagParam : null;

  const { total, totalPages, catalogTotal, products, activeTag, hasMore } =
    await getCatalogData({ rawPage, tagId, untagged });
  const page = Math.max(1, Math.min(rawPage, totalPages));
  const showHealth = isAdmin && untagged && total === 0 && catalogTotal > 0;

  function hrefFor(pageNum: number) {
    const search = new URLSearchParams();
    if (untagged) search.set("untagged", "1");
    else if (tagId) search.set("tag", tagId);
    if (pageNum > 1) search.set("page", String(pageNum));
    const qs = search.toString();
    return qs ? `/?${qs}` : "/";
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Suspense fallback={null}>
        <CatalogLocationMemory />
      </Suspense>
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

      <TagFilter
        activeTag={tagId ? activeTag : null}
        untagged={untagged}
        isAdmin={isAdmin}
      />

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
            sourceLanguage={product.sourceLanguage}
            translations={product.translations}
            isAdmin={isAdmin}
            priority={page === 1 && index === 0}
          />
        ))}
      </div>
      {showHealth && <CatalogHealthMessage />}
      {!showHealth && total === 0 && <EmptyCatalogMessage />}
      {!showHealth && total > 0 && products.length === 0 && <NoFilterResultsMessage />}

      {totalPages > 1 && (
        <nav className="mt-12 flex items-center justify-center gap-4 text-sm">
          {page > 1 ? (
            <Link
              href={hrefFor(page - 1)}
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
              href={hrefFor(page + 1)}
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