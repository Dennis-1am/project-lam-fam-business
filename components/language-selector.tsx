"use client";

import { useLanguage } from "@/lib/language-context";
import type { Language } from "@/lib/translations";

const OPTIONS: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "zh", label: "中文" },
];

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  return (
    <select
      aria-label="Language"
      value={language}
      onChange={(e) => setLanguage(e.target.value as Language)}
      className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm focus:border-neutral-900 focus:outline-none"
    >
      {OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}