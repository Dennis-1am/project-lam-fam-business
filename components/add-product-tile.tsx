"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/language-context";

export function AddProductTile() {
  const t = useTranslation();

  return (
    <Link
      href="/admin/new"
      className="group block"
      aria-label={t("addProduct")}
    >
      <div className="relative aspect-square rounded-xl border border-dashed border-neutral-300 bg-neutral-50 flex flex-col items-center justify-center gap-2 text-neutral-400 transition group-hover:border-neutral-400 group-hover:text-neutral-700">
        <span className="text-4xl leading-none">+</span>
        <span className="text-sm font-medium">{t("addProduct")}</span>
      </div>
    </Link>
  );
}