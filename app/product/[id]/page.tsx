"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/site";
import { ProductGallery } from "@/components/product-gallery";
import { useLanguage, useTranslation } from "@/lib/language-context";
import { resolveLocalizedText } from "@/lib/product-i18n";
import type { ProductTranslationRow } from "@/lib/product-i18n";

type Product = {
  id: string;
  title: string;
  priceCents: number;
  description: string | null;
  sourceLanguage: string;
  translations: ProductTranslationRow[];
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

export default function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useTranslation();
  const { language } = useLanguage();
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
          <Link href="/" className="hover:text-neutral-900">
            {t("backToCatalog")}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-neutral-900">Loading...</span>
        </nav>
        <div className="rounded-xl border border-dashed border-neutral-300 py-24 text-center text-neutral-400">
          Loading...
        </div>
      </div>
    );
  }

  if (notFoundError || !product) {
    notFound();
  }

  const localized = resolveLocalizedText(product, language);
  const titleLangAttr =
    language !== product.sourceLanguage && localized.titleIsFallback
      ? product.sourceLanguage
      : undefined;
  const descriptionLangAttr =
    language !== product.sourceLanguage && localized.descriptionIsFallback
      ? product.sourceLanguage
      : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-6 text-sm text-neutral-500">
        <Link href="/" className="hover:text-neutral-900">
          {t("backToCatalog")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-neutral-900" lang={titleLangAttr}>
          {localized.title}
        </span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery images={product.images} />
        <div>
          <h1 className="text-3xl font-bold tracking-tight" lang={titleLangAttr}>
            {localized.title}
          </h1>
          {product.tag && (
            <span className="mt-2 inline-block rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
              {product.tag.name}
            </span>
          )}
          <p className="mt-2 text-2xl font-semibold text-neutral-800">
            {formatPrice(product.priceCents)}
          </p>
          {localized.description && (
            <p
              className="mt-6 whitespace-pre-line leading-relaxed text-neutral-600"
              lang={descriptionLangAttr}
            >
              {localized.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}