import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/molecules/list-skeleton";
import { ListingsContainer } from "@/components/templates/listings-container";
import { serverTransport } from "@/lib/api-transport.server";
import {
  emptyBrowsePlaces,
  fetchBrowseListings,
  fetchBrowsePlaces,
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
 * Two requests, not one, and the second is not redundancy. The page is the ten
 * rows under the reader's eyes; the map is the collection they are part of. The
 * server resolved both because seeding the map from the page — the obvious way to
 * save a call — paints ten pins where there should be thirty-two, and correcting
 * it only after the first filter change would mean the map lied on arrival and
 * told the truth afterwards.
 */
export default function ListingsPage() {
  return (
    <Suspense fallback={<ListSkeleton mapFirst cardCount={4} />}>
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

  const [data, places] = await Promise.all([
    fetchBrowseListings({}, serverTransport),
    fetchBrowsePlaces({}, serverTransport),
  ]);
  // No previous pins to keep on a first render, so a failed places read starts
  // the map empty rather than taking the whole page down over it.
  return (
    <ListingsContainer
      initialData={data}
      initialPlaces={places ?? emptyBrowsePlaces()}
    />
  );
}
