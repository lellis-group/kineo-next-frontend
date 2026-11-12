import type { ApiApplicationStatusCounts } from "../types/api";
import type { DashboardData, ReactivityStat } from "./contracts";

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

  const stats: ReactivityStat[] = [
    { label: "Taux de réponse des cabinets", value: `${rate}%`, accent: true },
    { label: "Candidatures envoyées", value: `${sent}` },
    { label: "Acceptées", value: `${counts.ACCEPTED}` },
  ];

  return {
    title: "Vos candidatures en chiffres",
    stats,
    tipTitle: "Conseil Kineo",
    tip: "Un message personnalisé fait la différence : mentionnez votre expérience et vos disponibilités dans chaque candidature pour augmenter vos chances d'acceptation.",
  };
}
