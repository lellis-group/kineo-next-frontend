import { Suspense } from "react";
import { DashboardContainer } from "@/components/templates/dashboard-container";
import { DashboardSkeleton } from "@/components/templates/dashboard-skeleton";
import { PublicHome } from "@/components/templates/public-home";
import { serverTransport } from "@/lib/api-transport.server";
import { fetchDashboardData } from "@/lib/dashboard";
import { requireMember } from "@/lib/require-member";
import { fetchServerAuth } from "@/lib/server-auth";

/**
 * Static shell. The session decides which of the two pages this is, and it is
 * read with `headers()` — uncached — so it cannot be awaited from the component
 * that blocks the route; the boundary is what keeps the route instant.
 *
 * The fallback is the dashboard skeleton: geometry-matched, so a member sees the
 * dashboard arrive without the layout shifting. An anonymous visitor sees it for
 * the length of one session read, which is shorter than the wait they had while
 * this page blocked on the same read.
 */
export default function HomePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Home />
    </Suspense>
  );
}

async function Home() {
  const auth = await fetchServerAuth();

  if (auth.status !== "member") {
    return <PublicHome />;
  }

  // The session was valid a moment ago; it can still expire before the data
  // read, and that has to land on /signin rather than the error boundary.
  const data = await requireMember(
    fetchDashboardData(auth.name, serverTransport),
  );

  return <DashboardContainer userName={auth.name} initialData={data} />;
}
