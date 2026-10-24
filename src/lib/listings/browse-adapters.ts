/**
 * Adapters for the browse feed — turn the listings payload into the
 * presentation contracts of `./browse-contracts`.
 *
 * French wording and derived figures only. Anything that needs a decision the
 * reader can audit (is this urgent? where is it?) comes straight from the row.
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
  BrowsePlacesData,
  MapPlace,
  MapPlaceListing,
  SpecialtyFacet,
} from "./browse-contracts";
import { adaptListingBase } from "./shared";

/**
 * Zeroed facets, for a response that carried none.
 *
 * Zeros rather than an absent panel: the feed can legitimately be empty, and a
 * reader who sees « 0 annonces » learns something, where a missing panel would
 * look like a broken page.
 */
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
    // Both coordinates or neither: a pin at 0,0 in the Gulf of Guinea is worse
    // than no pin, and a practice geocoded on one axis alone has nothing honest
    // to offer either.
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

/**
 * The map's places, as one entry per practice.
 *
 * The endpoint already grouped them, so there is nothing to group here. The
 * client used to round coordinates to three decimals — about a hundred metres —
 * and two openings written for the same address rounded apart drew as two pins
 * stacked on one pixel. `practiceId` is exact.
 *
 * A place with no coordinates is dropped rather than drawn at 0,0, which is in
 * the Gulf of Guinea. The endpoint counts those postings and the map says how
 * many could not be placed, so a practice that was never geocoded is a row in
 * the list and a number under the map — not a pin in the Atlantic.
 */
/**
 * The places a first render starts from when the endpoint gave nothing back.
 *
 * A function rather than a shared constant so no caller can mutate the one
 * object every other caller is holding.
 */
export function emptyBrowsePlaces(): BrowsePlacesData {
  return {
    places: [],
    unlocated: 0,
    totalPlaces: 0,
    truncated: false,
  };
}

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

    // Only what a popup reads. Filling the rest of `BrowseListing` would mean
    // inventing a specialty, an application count and a createdAt for a posting
    // the endpoint never sent.
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
 * The distribution panel, as one row per specialty in a fixed order.
 *
 * Every specialty is emitted even at zero, and the rows keep the backend's
 * order rather than being sorted by count: a bar chart whose bars jump around
 * between two refetches of the same collection is harder to read than one whose
 * positions hold still. The order is also the one the reader learned from the
 * filter row above.
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
      // Against `total`, not against the largest row: the panel is showing how
      // the collection is made up, so the bars have to sum to the same picture
      // as the count above them.
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });

  return { total, urgent: raw.urgent ?? 0, bySpecialty: rows };
}
