/** Applications domain — public surface (`@/lib/applications`). */

export {
  AWAITING_DECISION_STATUSES,
  awaitingDecisionCount,
  byNewestFirst,
  countForBucket,
  countForSituation,
  DECISION_SUMMARIES,
  decisionHeadline,
  decisionSummary,
  LISTING_FALLBACK_TITLE,
  practiceLabel,
  STATUS_HEADLINES,
  STATUS_META,
  WITHDRAWABLE_STATUSES,
} from "./adapters";
export {
  APPLICATION_CREATE_CODES,
  APPLY_SUCCESS,
  applyErrorMessage,
} from "./apply-errors";
export type {
  ApplicationEntry,
  ApplicationListingInfo,
  ApplicationsData,
  ApplicationsFilter,
  ApplicationsFilterOption,
  RejectionSituationFilter,
} from "./contracts";
export {
  APPLICATION_FILTERS,
  REJECTION_SITUATIONS,
} from "./contracts";
export type { PaginationParams } from "./service";
export {
  APPLICATIONS_PAGE_SIZE,
  applyToListing,
  fetchApplicationDetail,
  fetchApplicationsData,
  updateApplicationMessage,
  withdrawApplication,
} from "./service";
