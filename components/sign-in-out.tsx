"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/language-context";
import { LogoutButton } from "@/components/logout-button";

export function SignInOut({ onLoggedOut }: { onLoggedOut?: () => void }) {
  const t = useTranslation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        setIsLoggedIn(data.authenticated);
      } catch {
        setIsLoggedIn(false);
      }
    }
    checkSession();
  }, []);

  if (isLoggedIn) {
    return (
      <LogoutButton
        onLoggedOut={() => {
          setIsLoggedIn(false);
          onLoggedOut?.();
        }}
      />
    );
  }

  return (
    <Link
      href="/admin/login"
      className="text-sm text-neutral-500 transition-colors hover:text-neutral-900"
    >
      {t("signIn")}
    </Link>
  );
}