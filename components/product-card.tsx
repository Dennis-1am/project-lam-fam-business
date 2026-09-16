"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/site";
import { cropBoxStyle, cropFromRecord, cropSourceSizes } from "@/lib/crop";
import type { CroppableImage } from "@/lib/crop";
import { useLanguage, useTranslation } from "@/lib/language-context";
import { deleteProduct } from "@/app/actions";
import { resolveLocalizedText } from "@/lib/product-i18n";
import type { ProductTranslationRow } from "@/lib/product-i18n";
import { ConfirmDialog } from "./confirm-dialog";
import { DeleteButton } from "./delete-button";

type ProductCardProps = {
  id: string;
  title: string;
  priceCents: number;
  images: CroppableImage[];
  tag?: { id: string; name: string } | null;
  sourceLanguage?: string;
  translations?: ProductTranslationRow[];
  isAdmin?: boolean;
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
  priority = false,
}: ProductCardProps) {
  const t = useTranslation();
  const { language } = useLanguage();
  const cover = images[0];
  const coverCrop = cropFromRecord(cover ?? {});

  const localized = resolveLocalizedText(
    { title, description: null, sourceLanguage, translations },
    language,
  );
  const fallbackLang = language !== sourceLanguage && localized.titleIsFallback;

  const [confirming, setConfirming] = useState(false);

  const href = isAdmin ? `/admin/${id}/edit` : `/product/${id}`;
  return (
    <>
      <Link href={href} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
        {cover ? (
          coverCrop ? (
            <div className="relative h-full w-full overflow-hidden">
              <div style={cropBoxStyle(coverCrop)} className="absolute">
                <Image
                  src={cover.url}
                  alt={localized.title}
                  fill
                  sizes={cropSourceSizes(coverCrop, 50, 25)}
                  priority={priority}
                  className="object-cover transition-[transform] duration-300 group-hover:[transform:scale(1.05)]"
                />
              </div>
            </div>
          ) : (
            <Image
              src={cover.url}
              alt={localized.title}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              priority={priority}
              className="object-cover transition-[transform] duration-300 group-hover:[transform:scale(1.05)]"
            />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
            {t("noImage")}
          </div>
        )}
        {tag && (
          <span className="absolute left-2 top-2 rounded-md bg-white/90 px-2 py-0.5 text-xs font-medium text-neutral-700 shadow-sm">
            {tag.name}
          </span>
        )}
        {isAdmin && (
          <DeleteButton
            className="absolute right-2 top-2"
            aria-label={t("delete")}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setConfirming(true);
            }}
          />
        )}
      </div>
      <div className="mt-2 px-1">
        <h2
          className="truncate text-sm font-medium"
          lang={fallbackLang ? sourceLanguage : undefined}
        >
          {localized.title}
        </h2>
        <p className="text-sm font-semibold text-neutral-700">
          {formatPrice(priceCents)}
        </p>
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