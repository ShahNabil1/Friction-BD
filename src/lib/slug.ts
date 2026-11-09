export function normalizeSlug(input: string) {
  return (input || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/** Generate a URL-safe slug from a title */
export function generateSlug(title: string) {
  return (title || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}
