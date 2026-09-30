"use client";

import { useCallback, useState } from "react";
import { ErrorState } from "@/components/organisms/error-state";
import { ApplicationDetailView } from "@/components/templates/application-detail-view";
import {
  type ApplicationEntry,
  fetchApplicationDetail,
} from "@/lib/applications";

/**
 * Orchestrator for /applications/[id] — renders ApplicationDetailView.
 *
 * The application arrives from the server page. The refetch paths remain: the
 * backend does not always echo the updated row on a write, and a withdrawal has
 * to re-read the listing the candidates were attached to.
 */
export function ApplicationDetailContainer({
  id,
  initialApplication,
}: {
  id: string;
  initialApplication: ApplicationEntry;
}) {
  const [application, setApplication] =
    useState<ApplicationEntry>(initialApplication);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(() => {
    setError(null);
    fetchApplicationDetail(id)
      .then((entry) => setApplication(entry))
      .catch(setError);
  }, [id]);

  // Instant update when the API echoes the entry, refetch otherwise.
  const handleEntryUpdated = useCallback(
    (updated: ApplicationEntry | null) => {
      if (updated) {
        setApplication(updated);
      } else {
        load();
      }
    },
    [load],
  );

  if (error) {
    return <ErrorState error={error} onRetry={load} />;
  }

  return (
    <ApplicationDetailView
      application={application}
      onWithdrawn={handleEntryUpdated}
      onMessageSaved={handleEntryUpdated}
    />
  );
}
