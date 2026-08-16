export const siteConfig = {
  name: "Lam Life Shop",
  tagline: "Established Since: 2010",
  currency: "$",
};

export function formatPrice(priceCents: number): string {
  const amount = (priceCents / 100).toFixed(2);
  return `${siteConfig.currency}${amount}`;
}