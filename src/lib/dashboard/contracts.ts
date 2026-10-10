/**
 * Presentation-layer contracts for the logged-in homepage.
 * Components depend only on these types; the raw data is fetched and
 * adapted by the dashboard service (`./service`).
 */

import type { ButtonVariant } from "../ui-tokens";

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

export interface DashboardStat {
  id: string;
  title: string;
  /** Large-displayed value — number or key fact. */
  value: string;
  icon: "layers" | "users" | "calendar";
  label?: string;
  detail?: string;
}

export interface ActivityEntry {
  id: string;
  icon: "users" | "check" | "star" | "file";
  message: Array<{ text: string; bold?: boolean }>;
  timestamp: string;
  href?: string;
}

export interface ReactivityStat {
  label: string;
  value: string;
  accent?: boolean;
}

export interface DashboardData {
  greeting: UserSummary;
  actions: DashboardAction[];
  stats: DashboardStat[];
  activity: ActivityEntry[];
  /** True when GET /profile/me returns 404 — account exists, profile not yet created (onboarding, not an error). */
  needsProfile: boolean;
  reactivity: {
    title: string;
    stats: ReactivityStat[];
    tipTitle: string;
    tip: string;
  };
}
