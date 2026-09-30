"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ErrorState } from "@/components/organisms/error-state";
import { MemberHome } from "@/components/templates/member-home";
import { ApiError } from "@/lib/api-client";
import { type DashboardData, fetchDashboardData } from "@/lib/dashboard";

/**
 * Orchestrator for the logged-in page: delegates rendering to MemberHome.
 * Lives in `templates/` — organisms must never import templates.
 *
 * The data arrives already loaded from the server page, so there is no fetch on
 * mount and no skeleton on a warm navigation: what renders first is the real
 * dashboard. `reload` still exists for the client-side paths that have to
 * re-read — retrying after a failure, mainly.
 */
export function DashboardContainer({
  userName,
  initialData,
}: {
  userName?: string;
  initialData: DashboardData;
}) {
  const router = useRouter();
  const [data, setData] = useState<DashboardData>(initialData);
  const [error, setError] = useState<unknown>(null);
  const [reloading, setReloading] = useState(false);

  const reload = useCallback(() => {
    setReloading(true);
    setError(null);

    fetchDashboardData(userName)
      .then((dashboardData) => {
        setData(dashboardData);
        setReloading(false);
      })
      .catch((err) => {
        // Deleted account or expired session: the home page itself renders
        // PublicHome, but the client dashboard must not linger on an error.
        // `/signin`, not `/signup` — see `applications-container`.
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/signin");
          return;
        }
        setError(err);
        setReloading(false);
      });
  }, [router, userName]);

  if (error) {
    return <ErrorState error={error} onRetry={reload} />;
  }

  return (
    <div aria-busy={reloading || undefined}>
      <MemberHome data={data} />
    </div>
  );
}
