import { notFound } from "next/navigation";
import { updateProduct } from "@/app/actions";
import { ProductForm } from "@/components/product-form";
import { CatalogLink } from "@/components/catalog-link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { assembleProduct } from "@/lib/product-i18n";
import { getLanguage } from "@/lib/language-server";
import { getTranslation } from "@/lib/translations";
import type { Language } from "@/lib/translations";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

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

  const product = assembleProduct(productRow);
  const t = (key: string) => getTranslation(language, key);

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
          price:
            product.priceCents > 0
              ? (product.priceCents / 100).toFixed(2)
              : "",
          description: product.description ?? "",
          sourceLanguage: product.sourceLanguage as Language,
          translations: product.translations.map((translation) => ({
            language: translation.language,
            title: translation.title,
            description: translation.description,
            titleManual: translation.titleManual,
            descriptionManual: translation.descriptionManual,
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