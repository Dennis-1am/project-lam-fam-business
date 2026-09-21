"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { updateProduct } from "@/app/actions";
import { ProductForm } from "@/components/product-form";
import { CatalogLink } from "@/components/catalog-link";
import { useTranslation } from "@/lib/language-context";
import type { Language } from "@/lib/translations";

type Product = {
  id: string;
  title: string;
  priceCents: number;
  description: string | null;
  sourceLanguage: string;
  translations: Array<{
    language: string;
    title: string;
    description: string;
    titleManual: boolean;
    descriptionManual: boolean;
  }>;
  tagId: string | null;
  tag: { id: string; name: string } | null;
  images: Array<{
    id: string;
    url: string;
    cropX: number | null;
    cropY: number | null;
    cropWidth: number | null;
    cropHeight: number | null;
    position: number;
  }>;
};

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useTranslation();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFoundError, setNotFoundError] = useState(false);

  useEffect(() => {
    params.then(({ id }) => {
      fetch(`/api/products/${id}`)
        .then((res) => {
          if (!res.ok) {
            setNotFoundError(true);
            setLoading(false);
            return;
          }
          return res.json();
        })
        .then((data) => {
          if (data) {
            setProduct(data);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    });
  }, [params]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <nav className="mb-6 text-sm text-neutral-500">
          <CatalogLink href="/admin" className="hover:text-neutral-900">
            {t("products")}
          </CatalogLink>
          <span className="mx-2">/</span>
          <span className="text-neutral-900">Loading...</span>
        </nav>
        <h1 className="mb-8 text-2xl font-bold tracking-tight">
          {t("editProduct")}: Loading...
        </h1>
        <div className="rounded-xl border border-dashed border-neutral-300 py-24 text-center text-neutral-400">
          Loading...
        </div>
      </div>
    );
  }

  if (notFoundError || !product) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-6 text-sm text-neutral-500">
        <CatalogLink href="/admin" className="hover:text-neutral-900">
          {t("products")}
        </CatalogLink>
        <span className="mx-2">/</span>
        <span className="text-neutral-900">{product.title}</span>
      </nav>

      <h1 className="mb-8 text-2xl font-bold tracking-tight">
        {t("editProduct")}: {product.title}
      </h1>
      <ProductForm
        action={updateProduct}
        submitLabel={t("saveChanges")}
        productId={product.id}
        initial={{
          title: product.title,
          price: product.priceCents > 0 ? (product.priceCents / 100).toFixed(2) : "",
          description: product.description ?? "",
          sourceLanguage: product.sourceLanguage as Language,
          translations: product.translations.map((t) => ({
            language: t.language,
            title: t.title,
            description: t.description,
            titleManual: t.titleManual,
            descriptionManual: t.descriptionManual,
          })),
          tagId: product.tagId,
          tagName: product.tag?.name ?? null,
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