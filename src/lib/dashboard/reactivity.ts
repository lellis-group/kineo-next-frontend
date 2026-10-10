import type { ApiApplication } from "../types/api";
import type { DashboardData, ReactivityStat } from "./contracts";

export function adaptReactivity(
  applications: ApiApplication[],
): DashboardData["reactivity"] {
  // All metrics are about applications SENT by the user.
  const sent = applications.length;

  /**
   * Withdrawn applications stay out of the response rate.
   *
   * The rate answers "how often do cabinets answer me", and a withdrawn
   * application is one the user pulled back — it can never be answered, so
   * leaving it in the denominator turned a deliberate withdrawal into a mark
   * against the practice. Someone who withdrew four of five applications was
   * shown 20% under a metric that had nothing to do with the practices they
   * wrote to.
   */
  const answerable = applications.filter((a) => a.status !== "WITHDRAWN");
  const responded = answerable.filter((a) => a.respondedAt).length;
  const rate =
    answerable.length > 0
      ? Math.round((responded / answerable.length) * 100)
      : 0;

  const accepted = applications.filter((a) => a.status === "ACCEPTED").length;

  const stats: ReactivityStat[] = [
    { label: "Taux de réponse des cabinets", value: `${rate}%`, accent: true },
    { label: "Candidatures envoyées", value: `${sent}` },
    { label: "Acceptées", value: `${accepted}` },
  ];

  return {
    title: "Vos candidatures en chiffres",
    stats,
    tipTitle: "Conseil Kineo",
    tip: "Un message personnalisé fait la différence : mentionnez votre expérience et vos disponibilités dans chaque candidature pour augmenter vos chances d'acceptation.",
  };
}
