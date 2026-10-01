/**
 * Listings domain — the practice side: listings published by the user, the
 * candidates who applied to them, and the actions available on a listing.
 * Public surface of the module (imports stay `@/lib/listings`).
 */

export {
  ANONYMIZED_APPLICANT_NAME,
  countForFilter,
  countForReceivedFilter,
  countRecruitingListings,
  formatActiveApplications,
  formatCapacity,
  formatListingAge,
  LISTING_STATUS_META,
  RECEIVED_AWAITING_STATUSES,
  RECEIVED_DECISION_LABELS,
  RECEIVED_STATUS_LABELS,
  receivedDecisionLabel,
  specialtyLabel,
} from "./adapters";
export type {
  ApplicationApplicant,
  ListingApplicationsData,
  ListingStatusCounts,
  ListingStatusMeta,
  ListingsFilter,
  ListingsFilterOption,
  MyListing,
  ReceivedApplication,
  ReceivedApplicationCounts,
  ReceivedApplicationsFilter,
  ReceivedApplicationsFilterOption,
  ReplacementListingStatus,
} from "./contracts";
export {
  LISTING_FILTERS,
  RECEIVED_FILTERS,
  RECRUITING_STATUSES,
} from "./contracts";
export type { MyListingsData } from "./service";
export {
  cancelListing,
  closeListing,
  fetchListingApplications,
  fetchMyListing,
  fetchMyListings,
  LISTING_APPLICATIONS_PAGE_SIZE,
  MY_LISTINGS_PAGE_SIZE,
} from "./service";
