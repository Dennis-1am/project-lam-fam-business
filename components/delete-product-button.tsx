"use client";

import { deleteProduct } from "@/app/actions";
import { useTranslation } from "@/lib/language-context";

export function DeleteProductButton({
  productId,
  title,
}: {
  productId: string;
  title: string;
}) {
  const t = useTranslation();

  return (
    <form action={deleteProduct}>
      <input type="hidden" name="id" value={productId} />
      <button
        type="submit"
        className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:border-red-400"
        onClick={(e) => {
          if (!confirm(t("deleteConfirm").replace("{title}", title))) {
            e.preventDefault();
          }
        }}
      >
        {t("delete")}
      </button>
    </form>
  );
}