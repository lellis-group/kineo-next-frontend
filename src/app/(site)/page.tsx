import { Suspense } from "react";
import { DashboardContainer } from "@/components/templates/dashboard-container";
import { DashboardSkeleton } from "@/components/templates/dashboard-skeleton";
import { PublicHome } from "@/components/templates/public-home";
import { serverTransport } from "@/lib/api-transport.server";
import { fetchDashboardData } from "@/lib/dashboard";
import { fetchServerAuth } from "@/lib/server-auth";

/**
 * Server-side branch: dashboard for members, marketing for anonymous.
 *
 * The session resolves first, because it decides which of the two this is. The
 * dashboard itself is streamed behind a Suspense boundary, so the shell arrives
 * immediately and the member's data resolves in parallel with the layout's own
 * session read.
 */
export default async function HomePage() {
  const auth = await fetchServerAuth();

  if (auth.status === "member") {
    return (
      <Suspense fallback={<DashboardSkeleton />}>
        <MemberDashboard name={auth.name} />
      </Suspense>
    );
  }

  return <PublicHome />;
}

async function MemberDashboard({ name }: { name: string }) {
  const data = await fetchDashboardData(name, serverTransport);
  return <DashboardContainer userName={name} initialData={data} />;
}
