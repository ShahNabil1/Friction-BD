export const brandSlugToName = {
  rolex: "Rolex",
  casio: "Casio",
  gucci: "Gucci",
  versace: "Versace",
  seiko: "Seiko",
  tissot: "Tissot",
} as const;

export type BrandSlug = keyof typeof brandSlugToName;
export type BrandName = (typeof brandSlugToName)[BrandSlug];

export function isBrandSlug(slug: string): slug is BrandSlug {
  return Object.prototype.hasOwnProperty.call(brandSlugToName, slug);
}

export function brandNameToSlug(name: string): BrandSlug | null {
  const entry = (Object.entries(brandSlugToName) as Array<[BrandSlug, BrandName]>).find(([, n]) => n === name);
  return entry ? entry[0] : null;
}
