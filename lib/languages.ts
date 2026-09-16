import type { Language } from "@/lib/translations";

export const SUPPORTED_LANGUAGES: readonly Language[] = ["en", "es", "zh"];

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  es: "Español",
  zh: "中文",
};

export function isSupportedLanguage(value: string): value is Language {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

export function targetLanguages(source: Language): Language[] {
  return SUPPORTED_LANGUAGES.filter((lang) => lang !== source);
}

// Strip any markup an admin may have pasted so tags never reach the API (they
// consume quota) or the database. Handles HTML tags, HTML entities, and
// malformed/nested markup. Runs of horizontal whitespace collapse to a single
// space, while single spaces between words and line breaks are preserved
// (descriptions render with `whitespace-pre-line`).
export function stripMarkup(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")            // HTML tags
    .replace(/&[a-zA-Z]+;/g, " ")       // named entities  (&amp; &lt; etc.)
    .replace(/&#\d+;/g, " ")            // decimal entities  (&#38;)
    .replace(/&#x[0-9a-fA-F]+;/g, " ")  // hex entities  (&#x26;)
    .replace(/[^\S\n]+/g, " ")          // collapse horizontal whitespace, keep newlines
    .trim();
}