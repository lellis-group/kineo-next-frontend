import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Annonce — Kineo",
  description:
    "Détail d'une annonce de remplacement : cabinet, lieu, période, spécialité et description.",
};

/**
 * Public detail of one posting.
 *
 * Deliberately small for now: the feed's row click lands here, and the page
 * shows the facts the feed cannot — description, cabinet, city and status. A
 * richer layout (map, apply flow, related postings) is noted in
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
          <h1 className="min-w-0 flex-1 text-xl leading-snug font-bold break-words tracking-tight text-foreground sm:text-2xl">
            {listing.title}
          </h1>

          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            {listing.urgent && <Badge tone="danger">Urgent</Badge>}
            <Badge tone={status.tone}>{status.label}</Badge>
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

        {listing.description && (
          <div className="mt-8 border-t border-border pt-6">
            <h2 className="text-sm font-bold text-foreground">Description</h2>
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-muted">
              {listing.description}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
