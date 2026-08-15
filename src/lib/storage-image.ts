/**
 * Request Supabase Storage images through the on-the-fly image transformer.
 *
 * The owner's workout thumbnails are 6-8MB PNGs. Served raw, a single library screen pulls
 * tens of megabytes over mobile data. Supabase (Pro) can resize and re-encode on request, so
 * the same file comes back as WebP at the size actually displayed:
 *
 *   8,013,613 bytes  ->  69,428 bytes   (width=800, quality=70)
 *
 * The stored object is never modified, so this is reversible and safe to roll back — it only
 * changes the URL the client asks for.
 */

const PUBLIC_PATH = "/storage/v1/object/public/";
const RENDER_PATH = "/storage/v1/render/image/public/";

/** Widths that match how images are actually displayed, so we never fetch more than we show. */
export const IMG = {
  /** Inline exercise thumbnails in the player / timer. */
  tiny: 200,
  /** Cards and list rows. */
  card: 400,
  /** Hero and detail headers. */
  hero: 800,
} as const;

/**
 * Rewrite a Supabase public object URL to its transformed equivalent.
 *
 * Anything that isn't one of our own storage URLs is returned untouched — several call sites
 * render third-party images (OpenFoodFacts product shots, OAuth avatars) that this transformer
 * cannot serve.
 */
export function storageImage(
  url: string | null | undefined,
  width: number = IMG.card,
  quality = 70,
): string | undefined {
  if (!url || !url.includes(PUBLIC_PATH)) return url ?? undefined;
  const [base, existingQuery] = url.split("?");
  const params = new URLSearchParams(existingQuery);
  params.set("width", String(width));
  params.set("quality", String(quality));
  return `${base.replace(PUBLIC_PATH, RENDER_PATH)}?${params.toString()}`;
}
