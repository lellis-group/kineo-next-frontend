/**
 * Adapters for the browse feed — turn the listings payload into the
 * presentation contracts of `./browse-contracts`.
 */

import { formatDateRange } from "@/lib/format";
import { SPECIALTY_LABELS, SPECIALTY_SHORT_LABELS } from "@/lib/profile";
import type {
  ApiListingFacets,
  ApiListingPlaces,
  ApiPlaceListing,
  ApiReplacementListing,
  Specialty,
} from "@/lib/types/api";
import type {
  BrowseFacets,
  BrowseListing,
  BrowseListingDetail,
  BrowsePlacesData,
  MapPlace,
  MapPlaceListing,
  SpecialtyFacet,
} from "./browse-contracts";
import { adaptListingBase } from "./shared";

/** Zeroed facets, for a response that carried none. */
export function emptyFacets(): BrowseFacets {
  return {
    total: 0,
    urgent: 0,
    bySpecialty: (Object.keys(SPECIALTY_LABELS) as Specialty[]).map(
      (specialty) => ({
        specialty,
        label: SPECIALTY_SHORT_LABELS[specialty],
        count: 0,
        percent: 0,
      }),
    ),
    byStartWeek: [],
  };
}

export function adaptBrowseListing(
  listing: ApiReplacementListing,
): BrowseListing {
  const base = adaptListingBase(listing);
  const { practice } = listing;

  return {
    ...base,
    practiceName: practice?.name?.trim() || "Cabinet",
    city: practice?.city?.trim() || "",
    // Both coordinates or neither: no pin beats a pin at 0,0.
    location:
      typeof practice?.latitude === "number" &&
      typeof practice?.longitude === "number"
        ? { latitude: practice.latitude, longitude: practice.longitude }
        : null,
  };
}

export function adaptBrowseListings(
  listings: ApiReplacementListing[],
): BrowseListing[] {
  return listings.map(adaptBrowseListing);
}

/** The public detail of one posting: the feed row plus the backend status. */
export function adaptBrowseListingDetail(
  listing: ApiReplacementListing,
): BrowseListingDetail {
  return {
    ...adaptBrowseListing(listing),
    status: listing.status,
  };
}

/** A function rather than a shared constant, so no caller can mutate it. */
export function emptyBrowsePlaces(): BrowsePlacesData {
  return {
    places: [],
    unlocated: 0,
    totalPlaces: 0,
    truncated: false,
  };
}

/**
 * The map's places, one entry per practice (grouped by the endpoint). A place
 * with no coordinates is dropped rather than drawn at 0,0; the endpoint counts
 * those in `unlocated`.
 */
export function adaptBrowsePlaces(
  raw: ApiListingPlaces | undefined,
): BrowsePlacesData {
  if (!raw) {
    return emptyBrowsePlaces();
  }

  const places: MapPlace[] = [];

  for (const place of raw.places) {
    const { latitude, longitude } = place;
    if (latitude == null || longitude == null) {
      continue;
    }

    // Only what a popup reads: the endpoint sends nothing more.
    const previewOf = (listing: ApiPlaceListing): MapPlaceListing => ({
      id: listing.id,
      title: listing.title,
      dateRange: formatDateRange(listing.startDate, listing.endDate),
      practiceName: place.name,
      city: place.city,
      location: { latitude, longitude },
    });

    places.push({
      key: place.practiceId,
      latitude,
      longitude,
      count: place.count,
      listings: place.listings.map(previewOf),
    });
  }

  return {
    places,
    unlocated: raw.unlocated,
    totalPlaces: raw.totalPlaces,
    truncated: raw.truncated,
  };
}

/**
 * The distribution panel, one row per specialty. Every specialty is emitted
 * even at zero, in a fixed order rather than sorted by count, so the bars hold
 * still between refetches.
 */
export function adaptFacets(raw: ApiListingFacets | undefined): BrowseFacets {
  if (!raw) {
    return emptyFacets();
  }

  const specialties = Object.keys(SPECIALTY_LABELS) as Specialty[];
  const total = raw.total ?? 0;

  const rows: SpecialtyFacet[] = specialties.map((specialty) => {
    const count = raw.bySpecialty?.[specialty] ?? 0;
    return {
      specialty,
      label: SPECIALTY_SHORT_LABELS[specialty],
      count,
      // Against `total`, not the largest row, so the bars sum to the count above.
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });

  return {
    total,
    urgent: raw.urgent ?? 0,
    bySpecialty: rows,
    byStartWeek: (raw.byStartWeek ?? []).map(({ weekStart, count }) => ({
      weekStart,
      count,
    })),
  };
}
