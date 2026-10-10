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
  ApiReplacementListing,
  Specialty,
} from "@/lib/types/api";
import type {
  BrowseFacets,
  BrowseListing,
  MapPlace,
  SpecialtyFacet,
} from "./browse-contracts";

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
  const { practice } = listing;

  return {
    id: listing.id,
    title: listing.title,
    dateRange: formatDateRange(listing.startDate, listing.endDate),
    startDate: listing.startDate,
    endDate: listing.endDate,
    specialty: listing.specialty,
    urgent: listing.urgent,
    description: listing.description?.trim() || undefined,
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
    applicationsCount: listing.applicationsCount ?? 0,
    maxApplications: listing.maxApplications ?? undefined,
    createdAt: listing.createdAt,
  };
}

export function adaptBrowseListings(
  listings: ApiReplacementListing[],
): BrowseListing[] {
  return listings.map(adaptBrowseListing);
}

/**
 * The postings a map can pin, one entry per place.
 *
 * Two things happen here and both are load-bearing. Postings with no coordinates
 * are dropped — a pin at 0,0 is in the Gulf of Guinea, and a practice that was
 * never geocoded is a normal row rather than an error, so it belongs in the list
 * and nowhere on the map. The rest are grouped by coordinate, because a practice
 * with three openings would otherwise stack three buttons on one pixel and only
 * the topmost would be clickable.
 *
 * The grouping key rounds to three decimals — roughly a hundred metres. Exact
 * coordinates would split two listings written for the same practice address;
 * rounding to two would merge genuinely different practices in the same street.
 * At the zoom this map opens at, a hundred metres is well under a pixel either
 * way.
 */
export function groupByLocation(listings: BrowseListing[]): MapPlace[] {
  const byPlace = new Map<string, MapPlace>();

  for (const listing of listings) {
    if (!listing.location) {
      continue;
    }
    const { latitude, longitude } = listing.location;
    const key = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
    const existing = byPlace.get(key);

    if (existing) {
      existing.listings.push(listing);
    } else {
      byPlace.set(key, { key, latitude, longitude, listings: [listing] });
    }
  }

  return [...byPlace.values()];
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
