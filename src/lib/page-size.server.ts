import { cookies } from "next/headers";
import { PAGE_SIZE_COOKIE, type PageSize, readPageSize } from "@/lib/page-size";

/**
 * The member's chosen page size, for the page that seeds the first render.
 *
 * The cookie half of `lib/page-size.ts`, on the server side: the browser cannot
 * read local storage, so a preference stored there could only be applied after a
 * fetch the server page had already answered at the default size. This keeps the
 * cold load and every later load at the same number.
 *
 * It makes the route dynamic, which both console pages already are — they resolve
 * the session on the server, and a signed-out reader is redirected before any of
 * this runs.
 */
export async function readServerPageSize(): Promise<PageSize> {
  const store = await cookies();
  return readPageSize(store.get(PAGE_SIZE_COOKIE)?.value);
}
