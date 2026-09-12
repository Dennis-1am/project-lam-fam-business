"use client";

import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { LanguageToggle } from "@/components/language-toggle";
import { SignInOut } from "@/components/sign-in-out";
import { useTranslation } from "@/lib/language-context";

export function Header() {
  const t = useTranslation();

  return (
    <header className="border-b border-neutral-200">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          {siteConfig.name}
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="relative hover:text-neutral-900">
            {t("catalog")}
          </Link>
          <SignInOut />
          <LanguageToggle />
        </nav>
      </div>
    </header>
  );
}