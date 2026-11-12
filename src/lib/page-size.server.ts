import { cookies } from "next/headers";
import { PAGE_SIZE_COOKIE, type PageSize, readPageSize } from "@/lib/page-size";

/** The member's chosen page size, read from the cookie for the server render. */
export async function readServerPageSize(): Promise<PageSize> {
  const store = await cookies();
  return readPageSize(store.get(PAGE_SIZE_COOKIE)?.value);
}
