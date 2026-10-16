import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/molecules/list-skeleton";
import { ApplicationsContainer } from "@/components/templates/applications-container";
import { serverTransport } from "@/lib/api-transport.server";
import { fetchApplicationsData } from "@/lib/applications";
import { readServerPageSize } from "@/lib/page-size.server";
import { requireMember } from "@/lib/require-member";

export const metadata: Metadata = {
  title: "Mes candidatures — Kineo",
  description:
    "Suivez l'état de vos candidatures aux annonces de remplacement : envoyée, vue, présélectionnée, acceptée ou refusée.",
};

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Applications />
    </Suspense>
  );
}

async function Applications() {
  // Seeded at the size the reader chose, so the cold load is the page they are
  // coming back to rather than the default one they then have to grow into.
  const pageSize = await readServerPageSize();

  const data = await requireMember(
    fetchApplicationsData({ page: 1, limit: pageSize }, serverTransport),
  );
  return (
    <ApplicationsContainer initialData={data} initialPageSize={pageSize} />
  );
}
