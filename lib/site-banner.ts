import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { getLanguage } from "@/lib/language-server";
import type { CroppableImage } from "@/lib/crop";
import type { Language } from "@/lib/translations";

/** Shared by the read cache and `saveSiteBanner`, so a save always invalidates it. */
export const BANNER_TAG = "settings";
const BANNER_TTL_SECONDS = 300;

export const BANNER_SINGLETON_ID = 1;

export type BannerTextByLanguage = Record<Language, string>;

export type SiteBannerData = {
  /** Null until the admin uploads a background image. */
  image: CroppableImage | null;
  /** Language the admin writes in; the others translate from it. */
  sourceLanguage: Language;
  /** Text for every supported language, so the editor can show all fields. */
  translations: BannerTextByLanguage;
  /** Whether each language was hand-written rather than machine-translated. */
  manual: Record<Language, boolean>;
  /** Text for the visitor's language, falling back to the source language. */
  text: string;
};

/**
 * Reads the banner row plus all its translations. The cached part stops at the
 * raw rows: resolving the visitor's copy depends on a request cookie, so it
 * happens in `getSiteBanner` after the cache boundary.
 */
const getBannerRecord = unstable_cache(
  async () =>
    db.siteBanner.findUnique({
      where: { id: BANNER_SINGLETON_ID },
      select: {
        imageUrl: true,
        cropX: true,
        cropY: true,
        cropWidth: true,
        cropHeight: true,
        cropAspect: true,
        imageWidth: true,
        imageHeight: true,
        sourceLanguage: true,
        translations: { select: { language: true, text: true, textManual: true } },
      },
    }),
  ["site-banner"],
  { tags: [BANNER_TAG], revalidate: BANNER_TTL_SECONDS },
);

function toImage(record: {
  imageUrl: string | null;
  cropX: number | null;
  cropY: number | null;
  cropWidth: number | null;
  cropHeight: number | null;
  cropAspect: number | null;
  imageWidth: number | null;
  imageHeight: number | null;
}): CroppableImage | null {
  if (!record.imageUrl) return null;
  return {
    url: record.imageUrl,
    cropX: record.cropX,
    cropY: record.cropY,
    cropWidth: record.cropWidth,
    cropHeight: record.cropHeight,
    cropAspect: record.cropAspect,
    imageWidth: record.imageWidth,
    imageHeight: record.imageHeight,
  };
}

/** Narrows a stored language code to the three the app actually supports. */
export function toBannerLanguage(value: string): Language {
  return value === "es" || value === "zh" ? value : "en";
}

/**
 * Returns the banner for the visitor's language, or `null` when the admin has
 * never saved one — callers render the original hardcoded hero in that case, so
 * deploying before configuring anything is visually a no-op.
 */
export async function getSiteBanner(): Promise<SiteBannerData | null> {
  const row = await getBannerRecord();
  if (!row) return null;

  const translations: BannerTextByLanguage = { en: "", es: "", zh: "" };
  const manual: Record<Language, boolean> = { en: false, es: false, zh: false };
  for (const entry of row.translations) {
    const language = toBannerLanguage(entry.language);
    translations[language] = entry.text;
    manual[language] = entry.textManual;
  }

  const sourceLanguage = toBannerLanguage(row.sourceLanguage);
  // A half-translated banner falls back per language to the source, so filling
  // in only the Spanish text still shows Spanish when the rest is English.
  const own = translations[await getLanguage()];
  const text = own || translations[sourceLanguage];

  return { image: toImage(row), sourceLanguage, translations, manual, text };
}
