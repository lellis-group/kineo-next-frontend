/**
 * Listings domain — the practice side: listings published by the user, the
 * candidates who applied to them, and the actions available on a listing.
 * Public surface of the module (imports stay `@/lib/listings`).
 */

export {
  ANONYMIZED_APPLICANT_NAME,
  countForFilter,
  formatActiveApplications,
  formatCapacity,
  LISTING_STATUS_META,
  RECEIVED_STATUS_LABELS,
  specialtyLabel,
} from "./adapters";
export type {
  ApplicationApplicant,
  ListingStatusCounts,
  ListingStatusMeta,
  ListingsFilter,
  ListingsFilterOption,
  MyListing,
  ReceivedApplication,
} from "./contracts";
export {
  ACTIONABLE_STATUSES,
  LISTING_FILTERS,
  RECRUITING_STATUSES,
} from "./contracts";
export type {
  ListingApplicationsData,
  MyListingsData,
} from "./service";
export {
  cancelListing,
  closeListing,
  fetchListingApplications,
  fetchMyListings,
  removeListing,
} from "./service";
