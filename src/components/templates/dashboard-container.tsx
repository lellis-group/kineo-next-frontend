"use client";

import { useCallback } from "react";
import { ErrorState } from "@/components/organisms/error-state";
import { MemberHome } from "@/components/templates/member-home";
import { type DashboardData, fetchDashboardData } from "@/lib/dashboard";
import { useReloadable } from "@/lib/hooks/use-reloadable";

/**
 * Orchestrator for the logged-in page. The data arrives from the server page;
 * `reload` serves retries.
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
