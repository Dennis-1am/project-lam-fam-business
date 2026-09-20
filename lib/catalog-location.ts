export const CATALOG_LOCATION_KEY = "catalog-location";

function isValidPath(url: string): boolean {
  return url.startsWith("/") && !url.startsWith("//");
}

export function saveCatalogLocation(url: string) {
  if (typeof window === "undefined") return;
  if (isValidPath(url)) {
    sessionStorage.setItem(CATALOG_LOCATION_KEY, url);
  }
}

export function getSavedCatalogLocation(): string | null {
  if (typeof window === "undefined") return null;
  const url = sessionStorage.getItem(CATALOG_LOCATION_KEY);
  return url && isValidPath(url) ? url : null;
}

export function clearSavedCatalogLocation() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CATALOG_LOCATION_KEY);
}