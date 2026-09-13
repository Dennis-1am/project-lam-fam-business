"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/language-context";
import { SignInOut } from "@/components/sign-in-out";

export function FooterNav() {
  const t = useTranslation();

  return (
    <nav className="flex items-center text-sm text-neutral-500">
      <Link
        href="/"
        className="mr-6 transition-colors hover:text-neutral-900"
      >
        {t("catalog")}
      </Link>
      <SignInOut />
    </nav>
  );
}