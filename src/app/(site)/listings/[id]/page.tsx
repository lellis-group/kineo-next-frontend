import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoadingState } from "@/components/molecules/loading-state";
import { Panel } from "@/components/molecules/panel";
import { ApplyToListing } from "@/components/organisms/apply-to-listing";
import { BrowseListingDetailView } from "@/components/templates/browse-listing-detail-view";
import { serverTransport } from "@/lib/api-transport.server";
import { fetchListingImages } from "@/lib/files";
import { fetchBrowseListing } from "@/lib/listings";
import { requireExisting } from "@/lib/require-member";
import { fetchServerAuth } from "@/lib/server-auth";

export const metadata: Metadata = {
  title: "Annonce — Kineo",
  description:
    "Détail d'une annonce de remplacement : cabinet, lieu, période, spécialité et description.",
};

/**
 * The apply entry, matched to who is reading: no profile gets a link to create
 * one, an installed-practice profile (which the backend refuses) gets nothing.
 * The listing is members-only, so `anonymous` means the session read failed on
 * its own. Everything else (own listing, quotas…) is refused by the backend.
 */
function ApplyEntry({ listingId }: { listingId: string }) {
  return (
    <Suspense fallback={null}>
      <ApplyEntryInner listingId={listingId} />
    </Suspense>
  );
}

async function ApplyEntryInner({ listingId }: { listingId: string }) {
  const auth = await fetchServerAuth();

  switch (auth.status) {
    case "anonymous":
      return null;
    case "unavailable":
      // The posting stays readable; only the apply entry needs the session.
      return (
        <Panel title="Candidature">
          <p className="text-sm text-muted">
            Impossible de vérifier votre session pour le moment. Rechargez la
            page dans un instant pour postuler.
          </p>
        </Panel>
      );
    case "member":
      if (auth.role === null) {
        return (
          <Panel title="Candidature">
            <p className="text-sm text-muted">
              <Link href="/profile/create" className="font-medium">
                Créez votre profil
              </Link>{" "}
              pour postuler à cette annonce.
            </p>
          </Panel>
        );
      }
      return auth.role === "INSTALLED" ? null : (
        <Panel title="Candidature">
          <ApplyToListing listingId={listingId} />
        </Panel>
      );
  }
}

/** The detail of one posting, with an apply entry matched to the reader. */
export default function BrowseListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<LoadingState label="Chargement de l'annonce" />}>
      <BrowseListingDetailPageInner params={params} />
    </Suspense>
  );
}

async function BrowseListingDetailPageInner({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [listing, photos] = await Promise.all([
    requireExisting(fetchBrowseListing(id, serverTransport)),
    fetchListingImages(id, serverTransport),
  ]);

  return (
    <BrowseListingDetailView
      listing={listing}
      photos={photos}
      apply={<ApplyEntry listingId={listing.id} />}
    />
  );
}
