import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/molecules/list-skeleton";
import { ApplicationsContainer } from "@/components/templates/applications-container";
import { serverTransport } from "@/lib/api-transport.server";
import {
  APPLICATIONS_PAGE_SIZE,
  fetchApplicationsData,
} from "@/lib/applications";
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
  const data = await requireMember(
    fetchApplicationsData(
      { page: 1, limit: APPLICATIONS_PAGE_SIZE },
      serverTransport,
    ),
  );
  return <ApplicationsContainer initialData={data} />;
}
