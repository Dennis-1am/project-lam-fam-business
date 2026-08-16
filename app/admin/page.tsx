import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/site";
import { cropBoxStyle, cropFromRecord, cropSourceSizes } from "@/lib/crop";
import { LogoutButton } from "@/components/logout-button";
import { DeleteProductButton } from "@/components/delete-product-button";

export const metadata = {
  title: "Admin",
};

export default async function AdminPage() {
  await requireAdmin();

  const products = await db.product.findMany({
    include: { images: { orderBy: { position: "asc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/new"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white transition hover:bg-neutral-700"
          >
            Add product
          </Link>
          <LogoutButton />
        </div>
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 py-24 text-center text-neutral-400">
          No products yet.
        </div>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          {products.map((product) => (
            <li
              key={product.id}
              className="flex items-center gap-4 p-4"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                {product.images[0] ? (
                  (() => {
                    const crop = cropFromRecord(product.images[0]);
                    return crop ? (
                      <div className="relative h-full w-full overflow-hidden">
                        <div style={cropBoxStyle(crop)} className="absolute">
                          <Image
                            src={product.images[0].url}
                            alt=""
                            fill
                            sizes={cropSourceSizes(crop, 16, 16)}
                            className="object-cover"
                          />
                        </div>
                      </div>
                    ) : (
                      <Image
                        src={product.images[0].url}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    );
                  })()
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{product.title}</p>
                <p className="text-sm text-neutral-500">
                  {formatPrice(product.priceCents)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/product/${product.id}`}
                  className="text-sm text-neutral-500 hover:text-neutral-900"
                >
                  View
                </Link>
                <Link
                  href={`/admin/${product.id}/edit`}
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:border-neutral-900"
                >
                  Edit
                </Link>
                <DeleteProductButton productId={product.id} title={product.title} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}