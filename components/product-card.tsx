"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/site";
import { cropBoxStyle, cropFromRecord, cropSourceSizes } from "@/lib/crop";
import type { CroppableImage } from "@/lib/crop";
import { useTranslation } from "@/lib/language-context";
import { deleteProduct } from "@/app/actions";

type ProductCardProps = {
  id: string;
  title: string;
  priceCents: number;
  images: CroppableImage[];
  isAdmin?: boolean;
  priority?: boolean;
};

export function ProductCard({
  id,
  title,
  priceCents,
  images,
  isAdmin = false,
  priority = false,
}: ProductCardProps) {
  const t = useTranslation();
  const cover = images[0];
  const coverCrop = cropFromRecord(cover ?? {});

  const href = isAdmin ? `/admin/${id}/edit` : `/product/${id}`;
  return (
    <Link href={href} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
        {cover ? (
          coverCrop ? (
            <div className="relative h-full w-full overflow-hidden">
              <div style={cropBoxStyle(coverCrop)} className="absolute">
                <Image
                  src={cover.url}
                  alt={title}
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
              alt={title}
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
        {isAdmin && (
          <button
            className="absolute top-2 right-2 bg-red-100 text-red-600 rounded-md w-8 h-8 flex items-center justify-center text-lg leading-none hover:bg-red-200 transition-colors"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (confirm(t("deleteConfirm").replace("{title}", title))) {
                const formData = new FormData();
                formData.append("id", id);
                deleteProduct(formData);
              }
            }}
            aria-label={t("delete")}
          >
            ×
          </button>
        )}
      </div>
      <div className="mt-2 px-1">
        <h2 className="truncate text-sm font-medium">{title}</h2>
        <p className="text-sm font-semibold text-neutral-700">
          {formatPrice(priceCents)}
        </p>
      </div>
    </Link>
  );
}