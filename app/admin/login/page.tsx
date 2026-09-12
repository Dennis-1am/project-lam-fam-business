"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { useTranslation } from "@/lib/language-context";

export default function LoginPage() {
  const t = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setRedirecting(true);
          router.push("/admin");
          router.refresh();
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading || redirecting) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-16">
        <h1 className="mb-8 text-2xl font-bold tracking-tight">{t("adminSignIn")}</h1>
        <div className="rounded-xl border border-dashed border-neutral-300 py-24 text-center text-neutral-400">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-16">
      <h1 className="mb-8 text-2xl font-bold tracking-tight">{t("adminSignIn")}</h1>
      <LoginForm />
    </div>
  );
}