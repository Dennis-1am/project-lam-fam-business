"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cropBoxStyle, cropFromRecord, cropSourceSizes } from "@/lib/crop";
import type { CroppableImage } from "@/lib/crop";

type GalleryImage = CroppableImage & { id: string };

export function ProductGallery({ images }: { images: GalleryImage[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || images.length <= 1) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(Number(entry.target.getAttribute("data-index")));
          }
        }
      },
      { root: container, threshold: 0.6 },
    );

    container
      .querySelectorAll<HTMLElement>("[data-index]")
      .forEach((slide) => observer.observe(slide));

    return () => observer.disconnect();
  }, [images.length]);

  function jumpTo(index: number) {
    const container = containerRef.current;
    const slide = container?.querySelector<HTMLElement>(
      `[data-index="${index}"]`,
    );
    if (!container || !slide) return;
    const containerRect = container.getBoundingClientRect();
    const slideRect = slide.getBoundingClientRect();
    container.scrollTo({
      top: container.scrollTop + (slideRect.top - containerRect.top),
      left: container.scrollLeft + (slideRect.left - containerRect.left),
      behavior: "smooth",
    });
  }

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl border border-neutral-200 bg-neutral-100 text-neutral-400">
        No image
      </div>
    );
  }

  return (
    <div>
      <div
        ref={containerRef}
        className="flex snap-x snap-mandatory flex-row gap-4 overflow-x-auto overflow-y-hidden sm:h-[80vh] sm:flex-col sm:overflow-y-auto sm:overflow-x-hidden rounded-xl"
      >
        {images.map((image, index) => {
          const crop = cropFromRecord(image);
          return (
            <div
              key={image.id}
              data-index={index}
              className="relative aspect-square w-full shrink-0 snap-start"
            >
              {crop ? (
                <div className="relative h-full w-full overflow-hidden">
                  <div style={cropBoxStyle(crop)} className="absolute">
                    <Image
                      src={image.url}
                      alt={`Product image ${index + 1}`}
                      fill
                      priority={index === 0}
                      sizes={cropSourceSizes(crop, 100, 50)}
                      className="object-cover"
                    />
                  </div>
                </div>
              ) : (
                <Image
                  src={image.url}
                  alt={`Product image ${index + 1}`}
                  fill
                  priority={index === 0}
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              )}
            </div>
          );
        })}
      </div>

      {images.length > 1 && (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {images.map((image, index) => {
            const crop = cropFromRecord(image);
            return (
              <button
                key={image.id}
                type="button"
                onClick={() => jumpTo(index)}
                aria-label={`Jump to image ${index + 1}`}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border transition ${
                  index === active
                    ? "border-neutral-900"
                    : "border-neutral-200 opacity-70 hover:opacity-100"
                }`}
              >
                {crop ? (
                  <div className="relative h-full w-full overflow-hidden">
                    <div style={cropBoxStyle(crop)} className="absolute">
                      <Image
                        src={image.url}
                        alt=""
                        fill
                        sizes={cropSourceSizes(crop, 16, 16)}
                        className="object-cover"
                      />
                    </div>
                  </div>
                ) : (
                  <Image
                    src={image.url}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}