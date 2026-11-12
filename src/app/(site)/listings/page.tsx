import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/molecules/list-skeleton";
import { ListingsContainer } from "@/components/templates/listings-container";
import { serverTransport } from "@/lib/api-transport.server";
import {
  browsePageClamp,
  browseViewFromParams,
  browseViewToParams,
  fetchBrowseListings,
  fetchBrowsePlaces,
  fetchFacets,
  toBrowseView,
} from "@/lib/listings";
import { requireMember } from "@/lib/require-member";

export const metadata: Metadata = {
  title: "Annonces — Kineo",
  description:
    "Parcourez les annonces de remplacement ouvertes : filtrez par spécialité, période et urgence, et localisez chaque cabinet sur la carte.",
};

/**
 * The member-only feed, resolved on the server. The URL is the source of
 * truth: all three reads are seeded from it, and the client never refetches.
 *
 * The rows and facets are awaited; the map's places stay a promise, unwrapped
 * behind a `<Suspense>` in the container, so the slowest read can't hold up
 * the list.
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
  // Rebuilt as `URLSearchParams` so server and client parse the same way.
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") params.append(key, value);
    else if (Array.isArray(value))
      for (const item of value) params.append(key, item);
  }
  const { filters, page, sort } = browseViewFromParams(params);
  const view = toBrowseView(filters, page, sort);

  const [data, facets] = await requireMember(
    Promise.all([
      fetchBrowseListings(view, serverTransport),
      fetchFacets(view, serverTransport),
    ]),
  );

  // A page past the end redirects to the last page, rewriting the URL.
  const clampedPage = browsePageClamp(view.page, data.totalPages);
  if (clampedPage !== null) {
    redirect(
      `/listings?${browseViewToParams(filters, clampedPage, sort).toString()}`,
    );
  }

  const places = fetchBrowsePlaces(view, serverTransport).catch(() => null);

  // A failed places read starts the map empty rather than failing the page.
  return (
    <ListingsContainer
      initialData={data}
      initialFacets={facets}
      initialPlaces={places}
    />
  );
}
