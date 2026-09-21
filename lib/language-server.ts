import { cookies } from "next/headers";
import type { Language } from "./translations";

const LANGUAGE_COOKIE = "language";

export async function getLanguage(): Promise<Language> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LANGUAGE_COOKIE)?.value;
  return value === "es" || value === "zh" ? value : "en";
}