/** Presentation contracts for the logged-in homepage. */

import type { ListingStatusRow } from "../listings";
import type { BadgeTone, ButtonVariant } from "../ui-tokens";

export interface UserSummary {
  name: string;
  /** Deterministic summary of user activity (active listings, sent applications). */
  subtitle: string;
  /** Small contextual line — e.g. "médecine générale · Paris". */
  meta?: string;
}

export type DashboardActionIcon = "plus" | "file" | "layers";

export interface DashboardAction {
  label: string;
  href: string;
  variant?: ButtonVariant;
  icon?: DashboardActionIcon;
}

/** The soonest recruiting posting still to come, or none. */
export interface NextReplacement {
  /** « Du 15 févr. au 22 févr. 2027 », or null when nothing is coming. */
  period: string | null;
  label: string;
  /** The posting's title and page, when there is one. */
  title?: string;
  href?: string;
}

export interface ActivityEntry {
  id: string;
  icon: "users" | "check" | "star" | "file";
  message: Array<{ text: string; bold?: boolean }>;
  timestamp: string;
  href?: string;
  /** The application's status, as its chip. */
  status: { label: string; tone: BadgeTone };
  /** The listing's period, when it still resolves. */
  period?: string;
  /** Practice · city, when known. */
  place?: string;
}

/** One figure in the applications panel's grid. */
export interface ReactivityFigure {
  icon: "file" | "clock" | "check" | "alert";
  label: string;
  value: string;
}

export interface DashboardData {
  greeting: UserSummary;
  actions: DashboardAction[];
  nextReplacement: NextReplacement;
  activity: ActivityEntry[];
  /** True when GET /profile/me returns 404 — account exists, profile not yet created (onboarding, not an error). */
  needsProfile: boolean;
  /** The member's listings by status, over the whole collection. */
  listings: { total: number; recruiting: number; rows: ListingStatusRow[] };
  reactivity: {
    /** Answered share of the answerable applications, 0–100. */
    rate: number;
    /** What `rate` is of, in words — the gauge's caption. */
    rateCaption: string;
    /** Open applications no practice has opened yet, over the whole collection. */
    unseen: number;
    figures: ReactivityFigure[];
    tipTitle: string;
    tip: string;
  };
}
