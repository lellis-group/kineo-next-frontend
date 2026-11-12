/** Shared French formatting helpers, free of React/Next imports. */

export function plural(count: number, suffix = "s"): string {
  return count > 1 ? suffix : "";
}

export function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const sameMonth =
    s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();

  if (sameMonth) {
    const startDay = s.toLocaleDateString("fr-FR", { day: "numeric" });
    const endDate = e.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
    return `Du ${startDay} au ${endDate}`;
  }

  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `Du ${s.toLocaleDateString("fr-FR", opts)} au ${e.toLocaleDateString(
    "fr-FR",
    opts,
  )}`;
}

export function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "il y a moins d'une heure";
  if (diffHours < 24) return `il y a ${diffHours} heures`;
  if (diffDays === 1) return "hier";
  if (diffDays < 7) return `il y a ${diffDays} jours`;
  return `il y a ${Math.floor(diffDays / 7)} semaines`;
}

/** A single day without the year — « 15 sept. » — for periods drawn on two lines. */
export function formatDayMonth(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

/**
 * Widens a `YYYY-MM-DD` input value to an ISO instant; `endOfDay` lands on the
 * last millisecond, so an upper bound includes the day picked.
 */
export function toIsoDayBound(
  date: string,
  endOfDay = false,
): string | undefined {
  if (!date) {
    return undefined;
  }
  const parsed = new Date(
    `${date}${endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z"}`,
  );
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

/** Absolute date in French — e.g. « 10 janv. 2026 ». */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Absolute date and time in French — e.g. « 10 janv. 2026 à 14:32 ». */
export function formatDateTime(dateStr: string): string {
  const time = new Date(dateStr).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${formatDate(dateStr)} à ${time}`;
}
