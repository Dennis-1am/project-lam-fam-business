import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/site";
import { ProductGallery } from "@/components/product-gallery";
import { CatalogLink } from "@/components/catalog-link";
import { assembleProduct, resolveLocalizedText } from "@/lib/product-i18n";
import { getLanguage } from "@/lib/language-server";
import { getTranslation } from "@/lib/translations";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [product, language] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: { translations: true },
    }),
    getLanguage(),
  ]);
  const title = product ? resolveLocalizedText(assembleProduct(product), language).title : undefined;
  return { title: title || "Product" };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const [productRow, language] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        tag: true,
        images: { orderBy: { position: "asc" } },
        translations: true,
      },
    }),
    getLanguage(),
  ]);

  if (!productRow) {
    notFound();
  }

  if (productRow.hidden) {
    notFound();
  }

  const product = assembleProduct(productRow);
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
        <CatalogLink className="hover:text-neutral-900">
          {getTranslation(language, "products")}
        </CatalogLink>
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
          {product.priceCents > 0 && (
            <p className="mt-2 text-2xl font-semibold text-neutral-800">
              {formatPrice(product.priceCents)}
            </p>
          )}
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