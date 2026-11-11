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
 * The entry the listing detail page offers for applying.
 *
 * The backend decides eligibility against facts only it holds, but the page can
 * already know who it is talking to, and hiding a button that the backend would
 * refuse is the honest version of the decision: a member without a profile
 * gets the way to build one, and an installed-practice-only profile — the one
 * type the backend refuses — gets nothing, because there is no sentence about
 * applying that would be true for them. There is no signed-out reader to
 * address: the listing itself is a members-only read, so by the time this
 * renders the backend has accepted the session. `anonymous` can only mean the
 * session read failed on its own, and then the entry stays out rather than
 * inviting a member to sign in again. What the page cannot cheaply know (own listing, quotas, a listing that
 * left circulation since) stays with the backend, and the refused apply says
 * so in French.
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

/**
 * Public detail of one posting.
 *
 * Reads the listing for everyone and the session beside it, so the apply entry
 * matches who is reading; the section branches on that, and the actual write
 * lives in `ApplyToListing`. A richer layout (map, related postings) is noted in
 * `PLAN-listings-detail-page.md` rather than built here.
 */
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
