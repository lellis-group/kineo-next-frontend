/**
 * Listings domain — public surface (`@/lib/listings`). The practice side
 * first, then the browse feed.
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
export {
  APPLICATION_DECISION_CODES,
  applicationDecisionErrorMessage,
} from "./application-decision-errors";
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
  acceptReceivedApplication,
  cancelListing,
  closeListing,
  fetchListingApplications,
  fetchMyListing,
  fetchMyListings,
  LISTING_APPLICATIONS_PAGE_SIZE,
  markApplicationViewed,
  rejectReceivedApplication,
  shortlistReceivedApplication,
} from "./service";

/* Browse feed — the replacement doctor's side (`/listings`). */

export {
  adaptBrowseListing,
  adaptBrowseListingDetail,
  adaptBrowseListings,
  adaptBrowsePlaces,
  adaptFacets,
  emptyBrowsePlaces,
  emptyFacets,
} from "./browse-adapters";
export { listingBadge } from "./browse-badges";
export type {
  BrowseFacets,
  BrowseFilters,
  BrowseFormFilters,
  BrowseHorizon,
  BrowseLayout,
  BrowseListing,
  BrowseListingDetail,
  BrowseListingsData,
  BrowseSelection,
  BrowseView,
  HorizonBounds,
  ListingLocation,
  MapPlace,
  MapPlaceListing,
  MapPoint,
  SpecialtyFacet,
  StartWeekFacet,
} from "./browse-contracts";
export {
  BROWSE_MAP_ID,
  type BrowsePlacesData,
  type BrowseSort,
  EMPTY_BROWSE_FILTERS,
} from "./browse-contracts";
export {
  horizonBounds,
  horizonBoundsFor,
  horizonForBounds,
} from "./browse-horizon";
export {
  BROWSE_PAGE_SIZE,
  fetchBrowseListing,
  fetchBrowseListings,
  fetchBrowsePlaces,
  fetchFacets,
  fetchListingPageOf,
  type ListingPageOfResult,
} from "./browse-service";
export {
  browsePageClamp,
  browseViewFromParams,
  browseViewToParams,
  DEFAULT_BROWSE_VIEW,
  isDefaultBrowseView,
  toBrowseView,
} from "./browse-url";
export type { ListingSpotlight } from "./spotlight";
export { spotlightClass } from "./spotlight";
export type { ListingsTableHandle } from "./table-handle";
