/** Dashboard domain — public surface (`@/lib/dashboard`). */

export type {
  ActivityEntry,
  DashboardAction,
  DashboardData,
  DashboardStat,
  ReactivityFigure,
  UserSummary,
} from "./contracts";
export { fetchDashboardData } from "./service";
