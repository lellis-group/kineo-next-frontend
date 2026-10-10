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
 * Dedicated listing page — routed by listing id. Reads the dynamic params inside
 * a Suspense boundary so the route stays instant-streamable instead of blocking
 * prerendering, like the candidate application page.
 *
 * The listing and its candidates are read together: the candidate read is scoped
 * to a listing the first one has to have authorised, and running them in
 * sequence would double the time to first paint for no gain.
 *
 * Neither read is allowed to degrade into an empty result. Both are wrapped in
 * `requireExisting` because both can answer "this is not yours" — the listing
 * read with a 404, the candidates read with a 403, the backend not being
 * consistent between the two — and a reader who guessed another practice's
 * listing id must land on the 404 page rather than on a crash or, worse, on a
 * confident « aucune candidature reçue » describing somebody else's posting.
 * The genuinely empty case arrives as a successful `total: 0`.
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
