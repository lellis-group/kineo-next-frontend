/**
 * Applications domain — presentation contracts, status adapters and the data
 * service. Public surface of the module (imports stay `@/lib/applications`).
 */

export {
  AWAITING_DECISION_STATUSES,
  countAwaitingDecision,
  DECISION_SUMMARIES,
  LISTING_FALLBACK_TITLE,
  POSTING_ENDED_SOURCES,
  STATUS_HEADLINES,
  STATUS_META,
  WITHDRAWABLE_STATUSES,
} from "./adapters";
export type {
  ApplicationEntry,
  ApplicationListingInfo,
  ApplicationsData,
  ApplicationsFilter,
  ApplicationsFilterOption,
} from "./contracts";
export { APPLICATION_FILTERS } from "./contracts";
export type { PaginationParams } from "./service";
export {
  APPLICATIONS_PAGE_SIZE,
  fetchApplicationDetail,
  fetchApplicationsData,
  updateApplicationMessage,
  withdrawApplication,
} from "./service";
