/**
 * How many rows a console list shows at a time, and where the member's choice
 * lives: a cookie, so the server page can seed the first render at that size.
 * Read back from an editable cookie, so `readPageSize` resolves, not trusts.
 *
 * Two lists: 500 application cards is too heavy to offer, 500 listing rows is
 * not. The cookie is shared, so each screen clamps to its own list.
 */

export const APPLICATIONS_PAGE_SIZE_CHOICES = [10, 25, 50, 100] as const;

export type ApplicationsPageSize =
  (typeof APPLICATIONS_PAGE_SIZE_CHOICES)[number];

export const MY_LISTINGS_PAGE_SIZE_CHOICES = [10, 25, 50, 100, 500] as const;

export type MyListingsPageSize = (typeof MY_LISTINGS_PAGE_SIZE_CHOICES)[number];

/** Every size any console screen may hold; each screen clamps to its own list. */
export const PAGE_SIZE_CHOICES = [10, 25, 50, 100, 500] as const;

export type PageSize = (typeof PAGE_SIZE_CHOICES)[number];

/** What a member sees before choosing, and what an unreadable cookie falls back to. */
export const DEFAULT_PAGE_SIZE: PageSize = 10;

/** Readable by the server page, so not httpOnly — nothing here is a secret. */
export const PAGE_SIZE_COOKIE = "kineo_page_size";

const PAGE_SIZE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function isPageSize(value: number): value is PageSize {
  return (PAGE_SIZE_CHOICES as readonly number[]).includes(value);
}

/** Narrows a resolved size to what one screen offers, else the default. */
export function clampPageSize<C extends PageSize>(
  size: PageSize,
  choices: readonly C[],
): C {
  return (choices as readonly number[]).includes(size)
    ? (size as C)
    : (DEFAULT_PAGE_SIZE as C);
}

/** The size to use; anything off the list reads as the default. */
export function readPageSize(raw: string | undefined): PageSize {
  if (!raw) return DEFAULT_PAGE_SIZE;

  const parsed = Number.parseInt(raw, 10);
  return isPageSize(parsed) ? parsed : DEFAULT_PAGE_SIZE;
}

/** The cookie to write for a size, or nothing at all when it is the default. */
export function pageSizeCookie(size: PageSize): string {
  const encoded = `${PAGE_SIZE_COOKIE}=${encodeURIComponent(size)}`;
  if (size === DEFAULT_PAGE_SIZE) {
    // No expiry: an unchanged preference stays a session cookie.
    return encoded;
  }
  return `${encoded}; Path=/; Max-Age=${PAGE_SIZE_COOKIE_MAX_AGE}; SameSite=Lax`;
}

/** `document.cookie` rather than a server action, so the list doesn't flicker. */
export function rememberPageSize(size: PageSize): void {
  if (typeof document === "undefined") return;
  // biome-ignore lint/suspicious/noDocumentCookie: synchronous on purpose — the Cookie Store API is async, and a preference that lands a tick after the click is one reload away from being read stale. Nothing here is a secret, so the server page that must honour it can read it.
  document.cookie = pageSizeCookie(size);
}
