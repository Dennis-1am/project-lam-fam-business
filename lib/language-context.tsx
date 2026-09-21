"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import type { Language } from "./translations";
import { translations } from "./translations";

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
};

const STORAGE_KEY = "language";
const COOKIE_NAME = "language";
const COOKIE_MAX_AGE = 31536000;

type StoredValue = Language | null;

function validLanguage(value: string | null | undefined): StoredValue {
  return value === "en" || value === "es" || value === "zh" ? value : null;
}

function getCookieLanguage(): StoredValue {
  return validLanguage(
    document.cookie
      .split("; ")
      .find((pair) => pair.startsWith(`${COOKIE_NAME}=`))
      ?.split("=")[1],
  );
}

const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "en";
  return (
    getCookieLanguage() ??
    validLanguage(window.localStorage.getItem(STORAGE_KEY)) ??
    "en"
  );
}

function notify() {
  listeners.forEach((listener) => listener());
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore(
    subscribe,
    getStoredLanguage,
    () => "en" as const,
  );

  const setLanguage = useCallback((lang: Language) => {
    window.localStorage.setItem(STORAGE_KEY, lang);
    document.cookie = `${COOKIE_NAME}=${lang};path=/;max-age=${COOKIE_MAX_AGE};samesite=Lax`;
    notify();
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

export function useTranslation() {
  const { language } = useLanguage();
  return (key: string) => translations[language][key] ?? translations.en[key] ?? key;
}