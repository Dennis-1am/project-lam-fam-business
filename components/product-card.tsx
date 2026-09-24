"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/site";
import type { CroppableImage } from "@/lib/crop";
import { useLanguage, useTranslation } from "@/lib/language-context";
import { deleteProduct, toggleProductHidden } from "@/app/actions";
import { resolveLocalizedText } from "@/lib/product-i18n";
import type { ProductTranslationRow } from "@/lib/product-i18n";
import { ConfirmDialog } from "./confirm-dialog";
import { DeleteButton } from "./delete-button";

function EyeIcon({ off = false }: { off?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      {off ? (
        <>
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
          <line x1="2" x2="22" y1="2" y2="22" />
        </>
      ) : (
        <>
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

type ProductCardProps = {
  id: string;
  title: string;
  priceCents: number;
  images: CroppableImage[];
  tag?: { id: string; name: string } | null;
  sourceLanguage?: string;
  translations?: ProductTranslationRow[];
  isAdmin?: boolean;
  hidden?: boolean;
  priority?: boolean;
};

export function ProductCard({
  id,
  title,
  priceCents,
  images,
  tag,
  sourceLanguage = "en",
  translations = [],
  isAdmin = false,
  hidden = false,
  priority = false,
}: ProductCardProps) {
  const t = useTranslation();
  const { language } = useLanguage();
  const cover = images[0];

  const localized = resolveLocalizedText(
    { title, description: null, sourceLanguage, translations },
    language,
  );
  const fallbackLang = language !== sourceLanguage && localized.titleIsFallback;

  const [confirming, setConfirming] = useState(false);
  const [isHidden, setIsHidden] = useState(hidden);

  const href = isAdmin ? `/admin/${id}/edit` : `/product/${id}`;
  return (
    <>
      <Link href={href} className="group block">
      <div className={`relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 ${isHidden ? "opacity-60" : ""}`}>
        {cover ? (
          <Image
            src={cover.url}
            alt={localized.title}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            priority={priority}
            className="object-contain transition-[transform] duration-300 group-hover:[transform:scale(1.05)]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
            {t("noImage")}
          </div>
        )}
        {tag && (
          <span
            className={`absolute left-2 ${isHidden ? "top-12" : "top-2"} rounded-md bg-white/90 px-2 py-0.5 text-xs font-medium text-neutral-700 shadow-sm`}
          >
            {tag.name}
          </span>
        )}
        {isAdmin && isHidden && (
          <span className="absolute left-2 top-2 rounded-md bg-neutral-900/80 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white shadow-sm">
            {t("hidden")}
          </span>
        )}
        {isAdmin && (
          <>
            <button
              type="button"
              aria-label={isHidden ? t("relist") : t("hide")}
              title={isHidden ? t("relist") : t("hide")}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsHidden((v) => !v);
                const formData = new FormData();
                formData.append("id", id);
                formData.append("hidden", String(!isHidden));
                toggleProductHidden(formData).catch(() => setIsHidden(isHidden));
              }}
              className="absolute right-10 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-neutral-600 shadow-md transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
            >
              <EyeIcon off={isHidden} />
            </button>
            <DeleteButton
              className="absolute right-2 top-2 z-10"
              aria-label={t("delete")}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setConfirming(true);
              }}
            />
          </>
        )}
      </div>
      <div className="mt-2 px-1">
        <h2
          className={`truncate text-sm font-medium ${isHidden ? "text-neutral-400" : ""}`}
          lang={fallbackLang ? sourceLanguage : undefined}
        >
          {localized.title}
        </h2>
        {priceCents > 0 && (
          <p className={`text-sm font-semibold ${isHidden ? "text-neutral-400" : "text-neutral-700"}`}>
            {formatPrice(priceCents)}
          </p>
        )}
      </div>
      </Link>
      <ConfirmDialog
        open={confirming}
        message={t("deleteConfirm").replace("{title}", localized.title)}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          const formData = new FormData();
          formData.append("id", id);
          deleteProduct(formData);
          setConfirming(false);
        }}
      />
    </>
  );
}