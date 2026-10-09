"use client";

import { useState } from "react";
import { BannerEditor } from "@/components/banner-editor";
import { CroppedImage } from "@/components/cropped-image";
import { LightroomModal } from "@/components/lightroom-modal";
import { cropFromRecord, cropSourceSizesPx } from "@/lib/crop";
import { useTranslation } from "@/lib/language-context";
import type { SiteBannerData } from "@/lib/site-banner";

/** The banner's container is `max-w-6xl` on desktop and near-full-bleed on mobile. */
const BANNER_DESKTOP_PX = 1152;
const BANNER_MOBILE_PX = 400;

/** The hero the homepage shipped before the banner existed, kept as the fallback. */
const FALLBACK_EYEBROW = "Wholesale since 2008";
const FALLBACK_TITLE = "Welcome to our shop";

type HeroBannerProps = {
  /** Null when the admin has never saved a banner. */
  banner: SiteBannerData | null;
  total: number;
  isAdmin: boolean;
};

function ExpandIcon() {
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
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

export function HeroBanner({ banner, total, isAdmin }: HeroBannerProps) {
  const t = useTranslation();
  const [editing, setEditing] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const image = banner?.image ?? null;
  const text = banner?.text ?? "";
  // A photo-only banner has no words to name it, so the button and the modal
  // fall back to a generic label rather than shipping an empty one.
  const accessibleTitle = text || t("bannerImageOnly");
  const displayCrop = image ? cropFromRecord(image) : null;

  // The fallback stands in for "no banner has been saved yet", not for "the
  // admin cleared the fields". A saved banner with text but no photo still
  // shows that text; only a banner with neither leaves an empty hole, so that
  // also falls back to the original hero.
  const showFallback = !banner || (!image && !text);

  const count = total > 0 ? `${total} ${total === 1 ? "product" : "products"}` : null;

  const fallbackHero = (
    <section className="pt-6">
      <p className="text-sm font-medium uppercase tracking-widest text-neutral-400">
        {FALLBACK_EYEBROW}
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">{FALLBACK_TITLE}</h1>
      {count ? <p className="mt-2 text-neutral-500">{count}</p> : null}
    </section>
  );

  // A banner with text but no photo is still ordinary, selectable text rather
  // than a button, so the copy stays accessible.
  const textHero = (
    <section className="pt-6">
      <h1 className="text-3xl font-bold tracking-tight">{text}</h1>
      {count ? <p className="mt-2 text-neutral-500">{count}</p> : null}
    </section>
  );

  // With an image the whole band is a button, so click-to-enlarge (visitors) or
  // click-to-edit (admin) works with a keyboard. Its accessible name is the
  // copy it displays rather than a generic label; the glyph is a span, never a
  // nested button, and the editor renders outside the band.
  const imageBand = image ? (
    <button
      type="button"
      onClick={() => (isAdmin ? setEditing(true) : setLightboxOpen(true))}
      aria-label={isAdmin ? `${accessibleTitle} — ${t("editBanner")}` : accessibleTitle}
      className={`relative block h-48 w-full overflow-hidden rounded-xl text-left sm:h-64 md:h-80 ${
        isAdmin ? "cursor-pointer" : "cursor-zoom-in"
      }`}
    >
      <span className="absolute inset-0 block">
        <CroppedImage
          image={image}
          alt=""
          sizes={
            displayCrop
              ? cropSourceSizesPx(displayCrop, BANNER_MOBILE_PX, BANNER_DESKTOP_PX)
              : "(min-width: 1024px) 1152px, 100vw"
          }
          priority
          layout="fill"
          fit="cover"
        />
      </span>
      {/* Fixed dark treatment so light text stays legible on any photo. */}
      <span className="absolute inset-0 block bg-black/40" />

      {text ? (
        <span className="absolute inset-0 flex items-center justify-start p-5 sm:p-7">
          <span className="max-w-[70%] text-left text-2xl font-bold tracking-tight text-white sm:text-4xl">
            {text}
          </span>
        </span>
      ) : null}

      {isAdmin ? (
        <span className="absolute right-3 top-3 rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white">
          {t("editBanner")}
        </span>
      ) : (
        <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/40 p-2 text-white">
          <ExpandIcon />
        </span>
      )}
    </button>
  ) : null;

  const editPill = isAdmin ? (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="absolute right-0 top-0 rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-600 transition hover:border-neutral-900 hover:text-neutral-900"
    >
      {t("editBanner")}
    </button>
  ) : null;

  let hero;
  if (imageBand) {
    hero = imageBand;
  } else if (showFallback) {
    hero = isAdmin ? (
      <div className="relative">
        {fallbackHero}
        {editPill}
      </div>
    ) : (
      fallbackHero
    );
  } else {
    hero = isAdmin ? (
      <div className="relative">
        {textHero}
        {editPill}
      </div>
    ) : (
      textHero
    );
  }

  return (
    <>
      {/* Consistent breathing room below every variant (image band, text, or
          fallback) so the filter row never sits flush against the banner. */}
      <div className="mb-10">{hero}</div>

      {/* The editor shows every language at once, so switching the header
          language no longer remounts it (that would discard in-progress edits). */}
      {isAdmin && editing ? (
        <BannerEditor banner={banner} onClose={() => setEditing(false)} />
      ) : null}

      {lightboxOpen && image ? (
        <LightroomModal
          imageUrl={image.url}
          alt={accessibleTitle}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}
    </>
  );
}
