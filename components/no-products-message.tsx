"use client";

import { useTranslation } from "@/lib/language-context";

function EmptyStateBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-300 py-24 text-center text-neutral-400">
      {children}
    </div>
  );
}

export function EmptyCatalogMessage() {
  const t = useTranslation();
  return <EmptyStateBox>{t("noProductsSoon")}</EmptyStateBox>;
}

export function NoFilterResultsMessage() {
  const t = useTranslation();
  return <EmptyStateBox>{t("noProductsFilter")}</EmptyStateBox>;
}