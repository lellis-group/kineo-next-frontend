/**
 * Client-side mirrors of the backend ceilings, for a fast refusal before an
 * upload. The backend remains authoritative: these values only save a round
 * trip, and a mismatch is always resolved in favour of its 413/415 answer.
 */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const CV_MAX_BYTES = 10 * 1024 * 1024;
export const LISTING_IMAGES_MAX = 5;

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const CV_ACCEPT = "application/pdf,.pdf";

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, "")} Mo`;
}
