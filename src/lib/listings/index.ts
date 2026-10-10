/**
 * Listings domain — the practice side: listings published by the user, the
 * candidates who applied to them, and the actions available on a listing.
 * Public surface of the module (imports stay `@/lib/listings`).
 */

export {
  countForFilter,
  countForReceivedFilter,
  countRecruitingListings,
  formatActiveApplications,
  formatCapacity,
  formatListingAge,
  LISTING_STATUS_META,
  RECEIVED_DECISION_LABELS,
  RECEIVED_STATUS_LABELS,
  receivedDecisionLabel,
  specialtyLabel,
} from "./adapters";
export type {
  ApplicationApplicant,
  ListingApplicationsData,
  ListingMessage,
  ListingStatusCounts,
  ListingStatusMeta,
  ListingsFilter,
  ListingsFilterOption,
  MyListing,
  ReceivedApplication,
  ReceivedApplicationCounts,
  ReceivedApplicationsFilter,
  ReceivedApplicationsFilterOption,
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
  listingReadErrorMessage,
  MY_LISTINGS_PAGE_SIZE,
} from "./service";

/*
 * Browse feed — the replacement doctor's side (`/listings`).
 *
 * Kept in its own block below the practice side rather than mixed into it: the
 * two screens share a backend and a status vocabulary, and interleaving their
 * contracts is how a reader ends up passing a `MyListing` where a
 * `BrowseListing` belongs.
 */

export {
  adaptBrowseListing,
  adaptBrowseListings,
  adaptFacets,
  emptyFacets,
  groupByLocation,
} from "./browse-adapters";
export type {
  BrowseFacets,
  BrowseFilters,
  BrowseFormFilters,
  BrowseHorizon,
  BrowseHorizonOption,
  BrowseListing,
  BrowseListingsData,
  BrowseView,
  ListingLocation,
  MapPlace,
  SpecialtyFacet,
} from "./browse-contracts";
export {
  BROWSE_HORIZONS,
  DEFAULT_BROWSE_VIEW,
  EMPTY_BROWSE_FILTERS,
  horizonForStart,
  horizonStart,
  isDefaultBrowseView,
  listingBadge,
  toBrowseView,
} from "./browse-contracts";
export {
  BROWSE_PAGE_SIZE,
  fetchBrowseListings,
  fetchFacets,
} from "./browse-service";
