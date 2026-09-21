import type { Language } from "@/lib/translations";

export type ProductTranslationRow = {
  language: string;
  title: string;
  description: string;
};

export type LocalizableProduct = {
  title: string;
  description: string | null;
  sourceLanguage: string;
  translations?: ProductTranslationRow[];
};

// The canonical columns no longer exist — every language, including the
// source, is a translation row. This re-attaches the source cell's text to the
// product DTO so read paths (catalog page, API routes) keep working unchanged.
export function assembleProduct<
  TPipeline extends { sourceLanguage: string; translations?: ProductTranslationRow[] },
>(
  product: TPipeline,
): TPipeline & { title: string; description: string | null } {
  const row = product.translations?.find(
    (t) => t.language === product.sourceLanguage,
  );
  return {
    ...product,
    title: row?.title ?? "",
    description: row?.description ?? null,
  };
}

export type ResolvedText = {
  title: string;
  description: string | null;
  titleIsFallback: boolean;
  descriptionIsFallback: boolean;
};

// Returns the text to display for a given language. When a field has no stored
// translation (quota wall, never translated, etc.) it falls back to the source
// text so the UI can render it wrapped in a `lang={sourceLanguage}` attribute
// and let the browser offer its own translation. Each field is flagged
// independently so partially-translated products still hint the missing one.
export function resolveLocalizedText(
  product: LocalizableProduct,
  language: Language,
): ResolvedText {
  if (language === product.sourceLanguage) {
    return {
      title: product.title,
      description: product.description,
      titleIsFallback: false,
      descriptionIsFallback: false,
    };
  }

  const row = product.translations?.find((t) => t.language === language);
  if (!row) {
    return {
      title: product.title,
      description: product.description,
      titleIsFallback: true,
      descriptionIsFallback: true,
    };
  }

  return {
    title: row.title || product.title,
    description: row.description || product.description,
    titleIsFallback: !row.title,
    descriptionIsFallback: !row.description,
  };
}