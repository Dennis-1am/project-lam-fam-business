"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { getSavedCatalogLocation } from "@/lib/catalog-location";

type CatalogLinkProps = {
  href?: string;
  className?: string;
  children: ReactNode;
};

export function CatalogLink({ href = "/", className, children }: CatalogLinkProps) {
  const router = useRouter();

  function goToLastCatalog(e: { preventDefault: () => void }) {
    const saved = getSavedCatalogLocation();
    if (!saved || saved === href) return;
    e.preventDefault();
    router.push(saved);
  }

  return (
    <Link href={href} onNavigate={goToLastCatalog} className={className}>
      {children}
    </Link>
  );
}