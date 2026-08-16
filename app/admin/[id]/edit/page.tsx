import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateProduct } from "@/app/actions";
import { ProductForm } from "@/components/product-form";

export const metadata = {
  title: "Edit product",
};

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
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
        <Link href="/admin" className="hover:text-neutral-900">
          Products
        </Link>
        <span className="mx-2">/</span>
        <span className="text-neutral-900">{product.title}</span>
      </nav>

      <h1 className="mb-8 text-2xl font-bold tracking-tight">
        Edit: {product.title}
      </h1>
      <ProductForm
        action={updateProduct}
        submitLabel="Save changes"
        productId={product.id}
        initial={{
          title: product.title,
          price: (product.priceCents / 100).toFixed(2),
          description: product.description,
          images: product.images.map((img) => ({
            url: img.url,
            cropX: img.cropX,
            cropY: img.cropY,
            cropWidth: img.cropWidth,
            cropHeight: img.cropHeight,
          })),
        }}
      />
    </div>
  );
}