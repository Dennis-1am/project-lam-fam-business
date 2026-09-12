"use client";

import { useLanguage } from "@/lib/language-context";

export function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2"
      role="switch"
      aria-checked={language === "zh"}
      aria-label={language === "en" ? "Switch to Chinese" : "Switch to English"}
      style={{ backgroundColor: language === "zh" ? "#18181b" : "#e4e4e7" }}
    >
      <span
        className="inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform"
        style={{ transform: language === "zh" ? "translateX(28px)" : "translateX(0)" }}
      />
      <span className="absolute left-2 text-[10px] font-medium text-neutral-400">
        EN
      </span>
      <span className="absolute right-2 text-[10px] font-medium text-neutral-400">
        中
      </span>
    </button>
  );
}