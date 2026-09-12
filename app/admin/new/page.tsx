"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createProduct } from "@/app/actions";
import { ProductForm } from "@/components/product-form";
import { useTranslation } from "@/lib/language-context";

export default function NewProductPage() {
  const t = useTranslation();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setAuthorized(true);
        } else {
          window.location.href = "/admin/login";
        }
      })
      .catch(() => {
        window.location.href = "/admin/login";
      });
  }, []);

  if (!authorized) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-xl border border-dashed border-neutral-300 py-24 text-center text-neutral-400">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-6 text-sm text-neutral-500">
        <Link href="/admin" className="hover:text-neutral-900">
          {t("products")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-neutral-900">{t("newProduct")}</span>
      </nav>

      <h1 className="mb-8 text-2xl font-bold tracking-tight">{t("newProduct")}</h1>
      <ProductForm action={createProduct} submitLabel={t("createProduct")} />
    </div>
  );
}