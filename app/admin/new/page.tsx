import { createProduct } from "@/app/actions";
import { ProductForm } from "@/components/product-form";
import { CatalogLink } from "@/components/catalog-link";
import { requireAdmin } from "@/lib/auth";
import { getLanguage } from "@/lib/language-server";
import { getTranslation } from "@/lib/translations";

export default async function NewProductPage() {
  await requireAdmin();

  const language = await getLanguage();
  const t = (key: string) => getTranslation(language, key);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-6 text-sm text-neutral-500">
        <CatalogLink href="/admin" className="hover:text-neutral-900">
          {t("products")}
        </CatalogLink>
        <span className="mx-2">/</span>
        <span className="text-neutral-900">{t("newProduct")}</span>
      </nav>

      <h1 className="mb-8 text-2xl font-bold tracking-tight">{t("newProduct")}</h1>
      <ProductForm action={createProduct} submitLabel={t("createProduct")} />
    </div>
  );
}