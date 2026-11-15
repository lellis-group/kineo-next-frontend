import { plural } from "../format";
import type { ApiApplicationStatusCounts } from "../types/api";
import type { DashboardData, ReactivityFigure } from "./contracts";

/** How many of the member's applications got an answer, from the totals. */
export function adaptReactivity(applications: {
  counts: ApiApplicationStatusCounts;
  respondedCount: number;
}): DashboardData["reactivity"] {
  const { counts, respondedCount } = applications;
  const sent = counts.total;

  // Withdrawn applications can never be answered, so they stay out of the
  // denominator — as they do in the backend's `respondedCount`.
  const answerable = sent - counts.WITHDRAWN;
  const rate =
    answerable > 0 ? Math.round((respondedCount / answerable) * 100) : 0;

  // Keep in step with `AWAITING_DECISION_STATUSES`.
  const awaiting = counts.PENDING + counts.SHORTLISTED;

  const figures: ReactivityFigure[] = [
    { icon: "file", label: "Envoyées", value: `${sent}` },
    { icon: "clock", label: "En attente", value: `${awaiting}` },
    { icon: "check", label: "Acceptées", value: `${counts.ACCEPTED}` },
    { icon: "alert", label: "Non retenues", value: `${counts.REJECTED}` },
  ];

  return {
    rate,
    rateCaption: `${respondedCount} réponse${plural(respondedCount)} sur ${answerable} candidature${plural(answerable)}`,
    figures,
    tipTitle: "Conseil Kineo",
    tip: "Un message personnalisé fait la différence : mentionnez votre expérience et vos disponibilités dans chaque candidature pour augmenter vos chances d'acceptation.",
  };
}
