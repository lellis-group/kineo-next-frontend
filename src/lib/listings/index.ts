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
  RECEIVED_DECISION_LABELS,
  RECEIVED_STATUS_LABELS,
  receivedDecisionLabel,
  recruitingCount,
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
  LISTING_STATUS_META,
  LISTING_STATUS_ORDER,
  RECEIVED_FILTERS,
  RECRUITING_STATUSES,
} from "./contracts";
export {
  ACTION_SUCCESS,
  LISTING_TRANSITION_CODES,
  listingActionErrorMessage,
  listingReadErrorMessage,
} from "./listing-errors";
export type { ListingActionKind, MyListingsData } from "./service";
export {
  cancelListing,
  closeListing,
  fetchListingApplications,
  fetchMyListing,
  fetchMyListings,
  LISTING_APPLICATIONS_PAGE_SIZE,
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
  adaptBrowsePlaces,
  adaptFacets,
  emptyBrowsePlaces,
  emptyFacets,
} from "./browse-adapters";
export type {
  BrowseFacets,
  BrowseFilters,
  BrowseFormFilters,
  BrowseHorizon,
  BrowseLayout,
  BrowseListing,
  BrowseListingsData,
  BrowseView,
  HorizonBounds,
  ListingLocation,
  MapPlace,
  MapPlaceListing,
  SpecialtyFacet,
} from "./browse-contracts";
export {
  BROWSE_MAP_ID,
  type BrowsePlacesData,
  type BrowseSort,
  browsePageClamp,
  browseViewFromParams,
  browseViewToParams,
  DEFAULT_BROWSE_VIEW,
  EMPTY_BROWSE_FILTERS,
  horizonBounds,
  horizonBoundsFor,
  horizonForBounds,
  isDefaultBrowseView,
  listingBadge,
  toBrowseView,
} from "./browse-contracts";
export {
  BROWSE_PAGE_SIZE,
  fetchBrowseListings,
  fetchBrowsePlaces,
  fetchFacets,
  fetchListingPageOf,
} from "./browse-service";
export type { CameraTarget } from "./map-camera";
export { cameraTargetFor, distinctPoints } from "./map-camera";
