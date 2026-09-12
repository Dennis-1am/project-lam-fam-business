"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/language-context";

export function LogoutButton({ onLoggedOut }: { onLoggedOut?: () => void }) {
  const router = useRouter();
  const t = useTranslation();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    onLoggedOut?.();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="text-sm text-neutral-500 hover:text-neutral-900"
    >
      {t("signOut")}
    </button>
  );
}