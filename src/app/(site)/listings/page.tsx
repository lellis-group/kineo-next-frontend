import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/molecules/list-skeleton";
import { ListingsContainer } from "@/components/templates/listings-container";
import { serverTransport } from "@/lib/api-transport.server";
import { fetchBrowseListings } from "@/lib/listings";

export const metadata: Metadata = {
  title: "Annonces — Kineo",
  description:
    "Parcourez les annonces de remplacement ouvertes : filtrez par spécialité, période et urgence, et localisez chaque cabinet sur la carte.",
};

/**
 * The public feed, resolved on the server.
 *
 * No `requireMember`: this is the page a locum lands on to find work, and the
 * endpoint behind it is anonymous on the backend. A signed-out reader is exactly
 * the reader who most needs to see that openings exist — the guard that keeps the
 * other member routes protected does not apply here, and `src/proxy.ts` has been
 * narrowed accordingly.
 *
 * The default view is the one the server sends, so the route paints with content
 * rather than with the skeleton the `Suspense` boundary would otherwise hold for
 * the whole round trip.
 */
export default function ListingsPage() {
  return (
    <Suspense fallback={<ListSkeleton mapFirst cardCount={4} />}>
      <Listings />
    </Suspense>
  );
}

async function Listings() {
  const data = await fetchBrowseListings({}, serverTransport);
  return <ListingsContainer initialData={data} />;
}
