/**
 * A path from the query string that is safe to navigate to, or `/`. A prefix
 * check is not enough (`/\evil.example`, `/\t/evil.example`), so the candidate
 * is resolved against a placeholder origin and kept only if it stays there;
 * the resolved path is what's returned.
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
