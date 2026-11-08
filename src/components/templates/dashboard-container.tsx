"use client";

import { useCallback } from "react";
import { ErrorState } from "@/components/organisms/error-state";
import { MemberHome } from "@/components/templates/member-home";
import { type DashboardData, fetchDashboardData } from "@/lib/dashboard";
import { useReloadable } from "@/lib/hooks/use-reloadable";

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
  const load = useCallback(() => fetchDashboardData(userName), [userName]);

  const { data, error, reloading, reload } = useReloadable(initialData, load);

  if (error) {
    return <ErrorState error={error} onRetry={reload} />;
  }

  return (
    <div aria-busy={reloading || undefined}>
      <MemberHome data={data} />
    </div>
  );
}
