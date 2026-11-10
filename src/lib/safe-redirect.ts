/**
 * A path from the query string that is safe to navigate to, or `/`.
 *
 * Only a path on this site gets through. A prefix check is not enough:
 * browsers read `/\evil.example` as `//evil.example`, and drop tabs and
 * newlines before resolving, so `/\t/evil.example` is the same host again.
 * The candidate is therefore resolved the way the browser will resolve it,
 * against a placeholder origin, and kept only if it is still on that origin.
 * What is returned is the resolved path, not the raw input, so nothing the
 * parser normalised away can come back at navigation time.
 */
const PLACEHOLDER_ORIGIN = "http://internal.invalid";

export function safeInternalPath(raw: string | null | undefined): string {
  if (!raw?.startsWith("/")) return "/";
  let url: URL;
  try {
    url = new URL(raw, PLACEHOLDER_ORIGIN);
  } catch {
    return "/";
  }
  if (url.origin !== PLACEHOLDER_ORIGIN) return "/";
  return `${url.pathname}${url.search}${url.hash}`;
}
