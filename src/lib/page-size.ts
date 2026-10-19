/**
 * How many rows a console list shows at a time, and where the member's choice
 * lives.
 *
 * A closed list of sizes rather than a free field: each of them is a page the
 * server has answered before, and a number that is not on the list is a page size
 * nobody has ever requested. It is read back off a cookie, which a reader can
 * edit, so `readPageSize` resolves rather than trusts.
 *
 * The cookie rather than local storage because the server page seeds the first
 * render from this same number. With local storage the first answer would always
 * be the default size and every visit would pay a second request to reach the
 * size the reader chose — on the two screens where the reader is most likely to
 * notice, since they are the ones they came back to.
 *
 * Not on the browse screen: its filters, page and sort already live in the URL,
 * which is a better home for a preference the reader may want to share or to walk
 * back through. The browse feed is also held at 10 by `BROWSE_PAGE_SIZE`, and the
 * map beside it is drawn from the same collection.
 *
 * Two lists, not one: a 500-row page of applications ships ~78 ko gzip and
 * renders ~500 cards (~12 000 DOM nodes), where the same page of listings is
 * ~40 ko gzip of much smaller rows. Offering 500 on /applications buys no
 * reading — nobody scrolls 500 application cards — while on /listings/mine it
 * stays defensible. The cookie stays shared, so each screen clamps what it
 * reads to its own list rather than rejecting the other's choice.
 */

/** Rows per page offered on /applications — the heavy cards. */
export const APPLICATIONS_PAGE_SIZE_CHOICES = [10, 25, 50, 100] as const;

export type ApplicationsPageSize =
  (typeof APPLICATIONS_PAGE_SIZE_CHOICES)[number];

/** Rows per page offered on /listings/mine — the lighter rows. */
export const MY_LISTINGS_PAGE_SIZE_CHOICES = [10, 25, 50, 100, 500] as const;

export type MyListingsPageSize = (typeof MY_LISTINGS_PAGE_SIZE_CHOICES)[number];

/**
 * Every size any console screen may hold, so a cookie written by one screen
 * stays readable by the other. `readPageSize` resolves against this union;
 * each screen clamps the result to its own list.
 */
export const PAGE_SIZE_CHOICES = [10, 25, 50, 100, 500] as const;

export type PageSize = (typeof PAGE_SIZE_CHOICES)[number];

/** What a member sees before choosing, and what an unreadable cookie falls back to. */
export const DEFAULT_PAGE_SIZE: PageSize = 10;

/**
 * The cookie's name.
 *
 * Namespaced like the session cookies Next writes, and readable by the server
 * page rather than hidden: nothing here is a secret, and a preference the server
 * must honour cannot be an httpOnly cookie.
 */
export const PAGE_SIZE_COOKIE = "kineo_page_size";

/** A year — long enough to stop asking, short enough to answer to a new default. */
const PAGE_SIZE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function isPageSize(value: number): value is PageSize {
  return (PAGE_SIZE_CHOICES as readonly number[]).includes(value);
}

/**
 * Narrows a resolved size to what one screen offers.
 *
 * The cookie is shared between /applications and /listings/mine, whose lists
 * differ (500 stays offered on the listings board only). A reader coming from
 * the other screen keeps their size when it exists on both lists; otherwise
 * they fall back to the default rather than sending a limit their own pager
 * never proposed.
 */
export function clampPageSize<C extends PageSize>(
  size: PageSize,
  choices: readonly C[],
): C {
  return (choices as readonly number[]).includes(size)
    ? (size as C)
    : (DEFAULT_PAGE_SIZE as C);
}

/**
 * The size to use, from whatever the cookie holds.
 *
 * Anything else — a value typed in by hand, a size retired from the list, an
 * empty cookie — reads as the default rather than being sent to the API. A
 * preference is not a query parameter to trust: it is one number on its way to
 * `?limit=`, and the server's own bound would answer it with a 400.
 */
export function readPageSize(raw: string | undefined): PageSize {
  if (!raw) return DEFAULT_PAGE_SIZE;

  const parsed = Number.parseInt(raw, 10);
  return isPageSize(parsed) ? parsed : DEFAULT_PAGE_SIZE;
}

/** The cookie to write for a size, or nothing at all when it is the default. */
export function pageSizeCookie(size: PageSize): string {
  const encoded = `${PAGE_SIZE_COOKIE}=${encodeURIComponent(size)}`;
  if (size === DEFAULT_PAGE_SIZE) {
    // No expiry: a session cookie, which is what a preference nobody has changed
    // should be. It keeps this out of every request the reader makes afterwards.
    return encoded;
  }
  return `${encoded}; Path=/; Max-Age=${PAGE_SIZE_COOKIE_MAX_AGE}; SameSite=Lax`;
}

/**
 * Records the choice, from the browser.
 *
 * `document.cookie` rather than a server action: the state has already changed,
 * the change is a preference, and a round trip to write four bytes the client
 * already holds would make the list flicker back to the old page size.
 */
export function rememberPageSize(size: PageSize): void {
  if (typeof document === "undefined") return;
  // biome-ignore lint/suspicious/noDocumentCookie: synchronous on purpose — the Cookie Store API is async, and a preference that lands a tick after the click is one reload away from being read stale. Nothing here is a secret, so the server page that must honour it can read it.
  document.cookie = pageSizeCookie(size);
}
