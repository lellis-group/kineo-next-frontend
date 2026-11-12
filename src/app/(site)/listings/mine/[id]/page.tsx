import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/molecules/loading-state";
import { ListingDetailContainer } from "@/components/templates/listing-detail-container";
import { serverTransport } from "@/lib/api-transport.server";
import {
  fetchListingApplications,
  fetchMyListing,
  LISTING_APPLICATIONS_PAGE_SIZE,
} from "@/lib/listings";
import { requireExisting } from "@/lib/require-member";

export const metadata: Metadata = {
  title: "Annonce — Kineo",
  description:
    "Détail d'une annonce de remplacement : période, spécialité, candidats reçus et actions sur les candidatures.",
};

/**
 * The owner's page for one listing. The listing and its candidates are read in
 * parallel, both under `requireExisting`: "not yours" arrives as a 404 on one
 * and a 403 on the other, and must land on the 404 page either way.
 */
export default function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<LoadingState label="Chargement de l'annonce" />}>
      <ListingDetailPageInner params={params} />
    </Suspense>
  );
}

async function ListingDetailPageInner({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [listing, received] = await Promise.all([
    requireExisting(fetchMyListing(id, serverTransport)),
    requireExisting(
      fetchListingApplications(
        id,
        { limit: LISTING_APPLICATIONS_PAGE_SIZE },
        serverTransport,
      ),
    ),
  ]);

  return (
    <ListingDetailContainer
      listingId={id}
      initialListing={listing}
      initialReceived={received}
    />
  );
}
