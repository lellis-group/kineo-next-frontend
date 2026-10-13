import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/molecules/list-skeleton";
import { ListingsContainer } from "@/components/templates/listings-container";
import { serverTransport } from "@/lib/api-transport.server";
import {
  fetchBrowseListings,
  fetchBrowsePlaces,
  fetchFacets,
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
 * The default view is the one the server sends, so the route paints with content
 * rather than with the skeleton the `Suspense` boundary would otherwise hold for
 * the whole round trip.
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
export default function ListingsPage() {
  return (
    <Suspense
      fallback={<ListSkeleton mapFirst titleBlock={false} cardCount={4} />}
    >
      <Listings />
    </Suspense>
  );
}

async function Listings() {
  // The authoritative check: a cookie the backend refuses reads as anonymous,
  // which is exactly the reader the proxy's fast path was there to catch early.
  const auth = await fetchServerAuth();
  if (auth.status !== "member") {
    redirect("/signin");
  }

  const [data, facets] = await Promise.all([
    fetchBrowseListings({}, serverTransport),
    // Not part of the rows' read any more, and for the same reason the two are
    // separate here: the panels depend on a subset of the filters, so the client
    // asks for them only when that subset changes. Awaiting them together is
    // still right — the first paint should not arrive without its summary.
    fetchFacets({}, serverTransport),
  ]);

  const places = fetchBrowsePlaces({}, serverTransport).catch(() => null);

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
