import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/molecules/loading-state";
import { ApplicationDetailContainer } from "@/components/templates/application-detail-container";
import { serverTransport } from "@/lib/api-transport.server";
import { fetchApplicationDetail } from "@/lib/applications";

export const metadata: Metadata = {
  title: "Candidature — Kineo",
  description:
    "Détail d'une candidature envoyée : annonce visée, message personnalisé et suivi des statuts.",
};

/**
 * Dedicated application page — routed by application id. Reads the dynamic
 * params inside a Suspense boundary so the route stays instant-streamable
 * instead of blocking prerendering.
 */
export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<LoadingState label="Chargement de la candidature" />}>
      <ApplicationDetailPageInner params={params} />
    </Suspense>
  );
}

async function ApplicationDetailPageInner({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const application = await fetchApplicationDetail(id, serverTransport);

  return (
    <ApplicationDetailContainer id={id} initialApplication={application} />
  );
}
