"use client";

import Image from "next/image";
import { useLayoutEffect, useEffect, useRef, useState } from "react";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
import { cropBoxStyle, cropFromRecord, imageAspectOf } from "@/lib/crop";
import type { CroppableImage } from "@/lib/crop";

type CroppedImageProps = {
  image: CroppableImage;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  /** "fill" crops the image into the space (default); "box" places it in an aspect-sized box, centered. */
  layout?: "fill" | "box";
  /**
   * How an uncropped image fills a "fill" container. "contain" (the default)
   * shows the whole photo with empty space around it, which is what the product
   * grid wants. "cover" fills the box and lets the overflow fall outside it,
   * which is what a fixed-height band like the homepage banner wants.
   */
  fit?: "contain" | "cover";
};

function useNaturalAspect(url: string): number | null {
  const [aspect, setAspect] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const img = new window.Image();
    img.onload = () => {
      if (cancelled) return;
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setAspect(img.naturalWidth / img.naturalHeight);
      }
    };
    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [url]);

  return aspect;
}

function AspectBox({
  aspect,
  className,
  children,
}: {
  aspect: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useIsomorphicLayoutEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const compute = () => {
      const pw = parent.clientWidth;
      const ph = parent.clientHeight;
      if (!pw || !ph) return;
      let width = pw;
      let height = width / aspect;
      if (height > ph) {
        height = ph;
        width = height * aspect;
      }
      setSize({
        width: Math.max(1, Math.round(width)),
        height: Math.max(1, Math.round(height)),
      });
    };
    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [aspect]);

  return (
    <div
      ref={ref}
      className={`relative ${className ?? ""}`}
      style={size ? { width: size.width, height: size.height } : { maxWidth: "100%", maxHeight: "100%" }}
    >
      {children}
    </div>
  );
}

export function CroppedImage({
  image,
  alt,
  sizes,
  priority,
  className,
  layout = "fill",
  fit = "contain",
}: CroppedImageProps) {
  const crop = cropFromRecord(image);
  const naturalAspect = useNaturalAspect(image.url);

  if (layout === "box") {
    const aspect = crop ? crop.aspect : (imageAspectOf(image) ?? naturalAspect ?? 1);
    return (
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <AspectBox aspect={aspect}>
          {crop ? (
            <div className="relative h-full w-full overflow-hidden">
              <div style={cropBoxStyle(crop)} className="absolute">
                <Image
                  src={image.url}
                  alt={alt}
                  fill
                  sizes={sizes}
                  priority={priority}
                  className={`object-cover ${className ?? ""}`}
                />
              </div>
            </div>
          ) : (
            <Image
              src={image.url}
              alt={alt}
              fill
              sizes={sizes}
              priority={priority}
              className={`object-cover ${className ?? ""}`}
            />
          )}
        </AspectBox>
      </div>
    );
  }

  if (crop) {
    return (
      <div className="relative h-full w-full overflow-hidden">
        <div style={cropBoxStyle(crop)} className="absolute">
          <Image
            src={image.url}
            alt={alt}
            fill
            sizes={sizes}
            priority={priority}
            className={`object-cover ${className ?? ""}`}
          />
        </div>
      </div>
    );
  }

  return (
    <Image
      src={image.url}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={`${fit === "cover" ? "object-cover" : "object-contain"} ${className ?? ""}`}
    />
  );
}