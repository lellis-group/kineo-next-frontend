/**
 * Shared listing adapter helpers — base mapping from `ApiReplacementListing`
 * to the fields both the practice side (`MyListing`) and the browse feed
 * (`BrowseListing`) render. Extracted so the two adapters cannot drift apart
 * on a field they both read.
 */
import { formatDateRange } from "@/lib/format";
import type { ApiReplacementListing } from "@/lib/types/api";

/** The fields every listing adapter reads off the raw payload. */
export interface ListingBase {
  id: string;
  title: string;
  dateRange: string;
  startDate: string;
  endDate: string;
  specialty: ApiReplacementListing["specialty"];
  urgent: boolean;
  description: string | undefined;
  applicationsCount: number;
  maxApplications: number | undefined;
  createdAt: string;
}

export function adaptListingBase(listing: ApiReplacementListing): ListingBase {
  return {
    id: listing.id,
    title: listing.title,
    dateRange: formatDateRange(listing.startDate, listing.endDate),
    startDate: listing.startDate,
    endDate: listing.endDate,
    specialty: listing.specialty,
    urgent: listing.urgent,
    description: listing.description?.trim() || undefined,
    applicationsCount: listing.applicationsCount ?? 0,
    maxApplications: listing.maxApplications ?? undefined,
    createdAt: listing.createdAt,
  };
}
