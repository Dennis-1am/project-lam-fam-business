"use client";

import Image from "next/image";
import { useCallback, useEffect } from "react";
import type { CroppableImage } from "@/lib/crop";
import { useTranslation } from "@/lib/language-context";
import { useScrollCarousel } from "@/lib/use-scroll-carousel";

export type GalleryImage = CroppableImage & { id: string };

type ImageCarouselProps = {
  images: GalleryImage[];
  startIndex: number;
  onClose: () => void;
};

export function ImageCarousel({ images, startIndex, onClose }: ImageCarouselProps) {
  const t = useTranslation();
  const { containerRef, active, scrollTo } = useScrollCarousel(images.length, startIndex);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      const el = containerRef.current;
      if (!el || images.length <= 1) return;
      const current = Math.round(el.scrollLeft / el.clientWidth);
      const delta = event.key === "ArrowRight" ? 1 : -1;
      scrollTo((current + delta + images.length) % images.length);
    },
    [containerRef, images.length, onClose, scrollTo],
  );

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  if (images.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-label={t("productImage")}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t("close")}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="h-5 w-5"
          aria-hidden
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <div
        ref={containerRef}
        role="group"
        aria-roledescription="carousel"
        aria-label={t("productImage")}
        className="relative flex min-h-0 flex-1 overflow-x-auto overflow-y-hidden snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((image, index) => (
          <div
            key={image.id}
            onClick={(e) => e.stopPropagation()}
            aria-label={`${t("productImage")} ${index + 1}`}
            className="relative h-full w-full shrink-0 snap-start"
          >
            <Image
              src={image.url}
              alt={`${t("productImage")} ${index + 1}`}
              fill
              priority={index === 0}
              sizes="100vw"
              className="object-contain"
            />
          </div>
        ))}
      </div>

      <div className="flex shrink-0 items-center justify-center gap-3 pb-4 pt-2 text-sm text-white/70">
        <span>
          {active + 1} / {images.length}
        </span>
      </div>

      {images.length > 1 && (
        <div className="flex shrink-0 justify-center gap-2 overflow-x-auto px-4 pb-8">
          {images.map((thumb, i) => (
            <button
              key={thumb.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                scrollTo(i);
              }}
              aria-label={t("jumpToImage")}
              aria-current={i === active}
              className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-opacity ${
                i === active
                  ? "border-white opacity-100"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <Image
                src={thumb.url}
                alt=""
                fill
                sizes="56px"
                className="object-contain"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}