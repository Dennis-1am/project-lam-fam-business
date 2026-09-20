"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { saveCatalogLocation } from "@/lib/catalog-location";

export function CatalogLocationMemory() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const search = searchParams.toString();
    saveCatalogLocation(search ? `${pathname}?${search}` : pathname);
  }, [pathname, searchParams]);

  return null;
}