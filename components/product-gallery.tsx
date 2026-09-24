"use client";

import { useState } from "react";
import { ImageCarousel } from "@/components/image-carousel";
import type { GalleryImage } from "@/components/image-carousel";
import { cropFromRecord, cropSourceSizes } from "@/lib/crop";
import { useTranslation } from "@/lib/language-context";
import { useScrollCarousel } from "@/lib/use-scroll-carousel";
import { CroppedImage } from "./cropped-image";

export type { GalleryImage };

function ExpandIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

export function ProductGallery({ images }: { images: GalleryImage[] }) {
  const t = useTranslation();
  const [carouselOpen, setCarouselOpen] = useState(false);
  const { containerRef, active, scrollTo } = useScrollCarousel(images.length);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl border border-neutral-200 bg-neutral-100 text-neutral-400">
        {t("noImage")}
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div
        ref={containerRef}
        role="group"
        aria-roledescription="carousel"
        aria-label={t("productImage")}
        className="relative flex aspect-square w-full cursor-zoom-in overflow-x-auto overflow-y-hidden rounded-xl border border-neutral-200 bg-neutral-100 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((image, index) => {
          const crop = cropFromRecord(image);
          return (
            <button
              key={image.id}
              type="button"
              onClick={() => setCarouselOpen(true)}
              aria-label={`${t("productImage")} ${index + 1}`}
              className="relative h-full w-full shrink-0 snap-start"
            >
              <CroppedImage
                image={image}
                alt={`${t("productImage")} ${index + 1}`}
                sizes={
                  crop
                    ? cropSourceSizes(crop, 100, 50)
                    : "(min-width: 768px) 50vw, 100vw"
                }
                priority={index === 0}
                layout="box"
              />
            </button>
          );
        })}

        <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-white/80 p-2 text-neutral-700 shadow-sm">
          <ExpandIcon />
        </span>
      </div>

      {images.length > 1 && (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1 pr-4">
          {images.map((thumb, index) => (
            <button
              key={thumb.id}
              type="button"
              onClick={() => scrollTo(index)}
              aria-label={t("jumpToImage")}
              aria-current={index === active}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-neutral-100 transition ${
                index === active
                  ? "border-neutral-900"
                  : "border-neutral-200 opacity-70 hover:opacity-100"
              }`}
            >
              <CroppedImage image={thumb} alt="" sizes="64px" layout="box" />
            </button>
          ))}
        </div>
      )}

      {carouselOpen && (
        <ImageCarousel
          images={images}
          startIndex={active}
          onClose={() => setCarouselOpen(false)}
        />
      )}
    </div>
  );
}