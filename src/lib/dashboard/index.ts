/** Dashboard domain — public surface (`@/lib/dashboard`). */

export type {
  ActivityEntry,
  DashboardAction,
  DashboardData,
  DashboardStat,
  ReactivityStat,
  UserSummary,
} from "./contracts";
export { fetchDashboardData } from "./service";
