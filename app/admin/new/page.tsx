import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createProduct } from "@/app/actions";
import { ProductForm } from "@/components/product-form";

export const metadata = {
  title: "New product",
};

export default async function NewProductPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-6 text-sm text-neutral-500">
        <Link href="/admin" className="hover:text-neutral-900">
          Products
        </Link>
        <span className="mx-2">/</span>
        <span className="text-neutral-900">New product</span>
      </nav>

      <h1 className="mb-8 text-2xl font-bold tracking-tight">New product</h1>
      <ProductForm action={createProduct} submitLabel="Create product" />
    </div>
  );
}