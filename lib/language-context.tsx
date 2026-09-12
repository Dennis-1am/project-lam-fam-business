"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Language } from "./translations";
import { translations } from "./translations";

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
};

const defaultContext: LanguageContextType = {
  language: "en",
  setLanguage: () => {},
  toggleLanguage: () => {},
};

const LanguageContext = createContext<LanguageContextType>(defaultContext);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("language") as Language | null;
    if (saved) {
      setLanguage(saved);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("language", lang);
  };

  const toggleLanguage = () => {
    handleSetLanguage(language === "en" ? "zh" : "en");
  };

  const value = mounted
    ? { language, setLanguage: handleSetLanguage, toggleLanguage }
    : defaultContext;

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function useTranslation() {
  const { language } = useLanguage();
  return (key: string) => translations[language][key] ?? translations.en[key] ?? key;
}