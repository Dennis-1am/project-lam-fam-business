"use client";

import { useEffect } from "react";
import { useTranslation } from "@/lib/language-context";

type LightroomModalProps = {
  imageUrl: string;
  alt: string;
  onClose: () => void;
};

/**
 * The visitor's full-screen view of the banner: just the uploaded photo, at its
 * natural crop, on a dark backdrop. It deliberately renders the raw image and
 * nothing else — no caption, cropping, or slideshow chrome — so nothing
 * distracts from the photo the admin chose. Managed Escape key and body scroll
 * lock mirror the product lightbox.
 */
export function LightroomModal({ imageUrl, alt, onClose }: LightroomModalProps) {
  const t = useTranslation();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t("close")}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl leading-none text-white transition-colors hover:bg-white/20"
      >
        ×
      </button>
      {/* The raw photo is intentional: it must show exactly the stored upload. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={alt}
        onClick={(event) => event.stopPropagation()}
        className="max-h-full max-w-full object-contain"
      />
    </div>
  );
}
