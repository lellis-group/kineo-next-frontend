import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/molecules/list-skeleton";
import { ListingsContainer } from "@/components/templates/listings-container";
import { serverTransport } from "@/lib/api-transport.server";
import {
  browseViewFromParams,
  fetchBrowseListings,
  fetchBrowsePlaces,
  fetchFacets,
  toBrowseView,
} from "@/lib/listings";
import { fetchServerAuth } from "@/lib/server-auth";

export const metadata: Metadata = {
  title: "Annonces — Kineo",
  description:
    "Parcourez les annonces de remplacement ouvertes : filtrez par spécialité, période et urgence, et localisez chaque cabinet sur la carte.",
};

/**
 * The member-only feed, resolved on the server.
 *
 * Guarded like every other member route, on two layers: `src/proxy.ts` bounces a
 * signed-out reader before the route runs, and the session is resolved for real
 * here so an expired cookie still lands on `/signin`.
 *
 * `fetchServerAuth` rather than `requireMember`, and that is not a preference.
 * `requireMember` redirects only on a 401, and the browse endpoints are anonymous
 * on the backend — a signed-out reader gets a 200 with the openings, never a 401,
 * so `requireMember` would sail straight past. Reading the session state is the
 * only check that actually answers "is this reader signed in".
 *
 * The URL is the source of truth, and the server answers whatever view it names.
 * `searchParams` is parsed once here into a view, and all three reads are seeded
 * with it, so a shared or bookmarked link paints its exact results — filters,
 * page and ordering — rather than the default view the route used to render
 * regardless of the query string. The client reads the same string and never
 * refetches, which is why the rows it shows are the rows the server just sent.
 *
 * Two of the three reads are awaited and the third is not, and the third is the
 * one that streams. The rows and the panels are what a reader reads, so the page
 * waits for them; the map's read is both the slowest and the largest answer on
 * the screen, and the map is drawn by a client-only chunk that arrives after the
 * HTML anyway. Held as a promise, it is unwrapped behind a `<Suspense>` boundary
 * inside the container, so it cannot hold up the list. Awaiting it here — the
 * obvious shape, and what this did — made the whole page wait for a map nobody
 * has scrolled to.
 *
 * The map's promise is also the only one that cannot fail loudly:
 * `fetchBrowsePlaces` answers `null` rather than throwing, and the `.catch`
 * guards the transport itself.
 */
export default function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <Suspense
      fallback={<ListSkeleton mapFirst titleBlock={false} cardCount={4} />}
    >
      <Listings searchParams={searchParams} />
    </Suspense>
  );
}

async function Listings({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // The authoritative check: a cookie the backend refuses reads as anonymous,
  // which is exactly the reader the proxy's fast path was there to catch early.
  const auth = await fetchServerAuth();
  if (auth.status !== "member") {
    redirect("/signin");
  }

  // The view the URL names, parsed once and widened once. `toBrowseView` widens
  // the date fields to ISO bounds and omits every unset filter, so the same view
  // the client will read back off the URL is the one every read is seeded with —
  // the two never describe different collections.
  //
  // The awaited `searchParams` is a plain record, and `browseViewFromParams`
  // reads it through `URLSearchParams.get` so the server and the client parse the
  // same string the same way — the client hands it `new URLSearchParams(...)`,
  // so the server builds one here. Repeated keys are kept as `get` reads them:
  // the first value, which is the only one a single-valued filter means.
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") params.append(key, value);
    else if (Array.isArray(value))
      for (const item of value) params.append(key, item);
  }
  const { filters, page, sort } = browseViewFromParams(params);
  const view = toBrowseView(filters, page, sort);

  const [data, facets] = await Promise.all([
    fetchBrowseListings(view, serverTransport),
    // A separate read from the rows, and still right to await together: the
    // panels depend on a subset of the filters (never the specialty, never the
    // page, never the ordering — `fetchFacets` drops them), and the first paint
    // should not arrive without its summary. On a page turn the server re-runs
    // this route, but `fetchFacets` answers the same collection it answered
    // before, so the panels hold their numbers.
    fetchFacets(view, serverTransport),
  ]);

  // The map is the whole filtered collection, not the page — seeded with the
  // view but no page, so paging does not redraw it.
  const places = fetchBrowsePlaces(view, serverTransport).catch(() => null);

  // No previous pins to keep on a first render, so a failed places read starts
  // the map empty rather than taking the whole page down over it.
  return (
    <ListingsContainer
      initialData={data}
      initialFacets={facets}
      initialPlaces={places}
    />
  );
}
