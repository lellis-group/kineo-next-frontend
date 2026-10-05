/**
 * Applications domain — presentation contracts, status adapters and the data
 * service. Public surface of the module (imports stay `@/lib/applications`).
 */

export {
  AWAITING_DECISION_STATUSES,
  byNewestFirst,
  countAwaitingDecision,
  countForBucket,
  DECISION_SUMMARIES,
  decisionHeadline,
  decisionSummary,
  LISTING_FALLBACK_TITLE,
  practiceLabel,
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
