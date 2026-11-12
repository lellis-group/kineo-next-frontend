import { Suspense } from "react";
import { DashboardContainer } from "@/components/templates/dashboard-container";
import { DashboardSkeleton } from "@/components/templates/dashboard-skeleton";
import { PublicHome } from "@/components/templates/public-home";
import { serverTransport } from "@/lib/api-transport.server";
import { fetchDashboardData } from "@/lib/dashboard";
import { requireMember } from "@/lib/require-member";
import { fetchKnownServerAuth } from "@/lib/server-auth";

/**
 * Static shell: the session (read with `headers()`) decides between the
 * dashboard and the marketing page, behind a dashboard-shaped fallback.
 */
export default function HomePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Home />
    </Suspense>
  );
}

async function Home() {
  // An unreadable session must not show the marketing page to a member.
  const auth = await fetchKnownServerAuth();

  if (auth.status !== "member") {
    return <PublicHome />;
  }

  // The session can still expire before the data read.
  const data = await requireMember(
    fetchDashboardData(auth.name, serverTransport),
  );

  return <DashboardContainer userName={auth.name} initialData={data} />;
}
