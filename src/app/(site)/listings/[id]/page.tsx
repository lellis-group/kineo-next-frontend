import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/atoms/badge";
import { Card } from "@/components/atoms/card";
import {
  CalendarIcon,
  ClockIcon,
  LayersIcon,
  MapPinIcon,
  StethoscopeIcon,
  UsersIcon,
} from "@/components/atoms/icons";
import { BackLink } from "@/components/molecules/back-link";
import { Fact, FactList } from "@/components/molecules/fact-list";
import { LoadingState } from "@/components/molecules/loading-state";
import { ApplyToListing } from "@/components/organisms/apply-to-listing";
import { serverTransport } from "@/lib/api-transport.server";
import { plural } from "@/lib/format";
import {
  fetchBrowseListing,
  formatCapacity,
  formatListingAge,
  LISTING_STATUS_META,
  specialtyLabel,
} from "@/lib/listings";
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
        <p className="text-sm text-muted">
          Impossible de vérifier votre session pour le moment. Rechargez la page
          dans un instant pour postuler.
        </p>
      );
    case "member":
      if (auth.role === null) {
        return (
          <p className="text-sm text-muted">
            <Link href="/profile/create" className="font-medium">
              Créez votre profil
            </Link>{" "}
            pour postuler à cette annonce.
          </p>
        );
      }
      return auth.role === "INSTALLED" ? null : (
        <ApplyToListing listingId={listingId} />
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
  const listing = await requireExisting(
    fetchBrowseListing(id, serverTransport),
  );

  const status = LISTING_STATUS_META[listing.status];
  const capacity = formatCapacity(
    listing.applicationsCount,
    listing.maxApplications,
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <BackLink href="/listings">Retour aux annonces</BackLink>

      <Card className="mt-8 p-6 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="min-w-0 flex-1 text-xl leading-snug font-medium break-words tracking-tight text-foreground sm:text-2xl">
            {listing.title}
          </h1>

          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            {listing.urgent && (
              <Badge tone="danger" size="md">
                Urgent
              </Badge>
            )}
            <Badge tone={status.tone} size="md">
              {status.label}
            </Badge>
          </div>
        </div>

        <FactList columns={3} className="mt-7">
          <Fact icon={LayersIcon} term="Cabinet">
            {listing.practiceName}
          </Fact>

          <Fact icon={MapPinIcon} term="Lieu">
            {listing.city || "—"}
          </Fact>

          <Fact icon={StethoscopeIcon} term="Spécialité">
            {specialtyLabel(listing.specialty)}
          </Fact>

          <Fact icon={CalendarIcon} term="Période">
            {listing.dateRange}
          </Fact>

          <Fact icon={UsersIcon} term="Candidats">
            {capacity ??
              `${listing.applicationsCount} candidature${plural(
                listing.applicationsCount,
              )}`}
          </Fact>

          <Fact icon={ClockIcon} term="Publication">
            {formatListingAge(listing)}
          </Fact>
        </FactList>

        <div className="mt-8">
          <ApplyEntry listingId={listing.id} />
        </div>

        {listing.description && (
          <div className="mt-8 border-t border-border pt-6">
            <h2 className="text-sm font-medium text-foreground">Description</h2>
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-muted">
              {listing.description}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
