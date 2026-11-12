/**
 * Parity contracts between the façade (`./api`) and the generated types
 * (`./api.gen`): a backend change that drops, renames or re-types a value the
 * frontend reads must fail compilation here.
 */
import { describe, expect, it } from "bun:test";
import {
  APPLICATION_DECISION_SOURCES,
  APPLICATION_REJECTION_BUCKETS,
  APPLICATION_STATUSES,
  type ApiApplicationBucketCounts,
  type ApiApplicationStatusCounts,
  type ApiListingSpecialtyCounts,
  type ApplicationDecisionSource,
  type ApplicationRejectionBucket,
  type ApplicationStatus,
  type ProfileType,
  REPLACEMENT_LISTING_STATUSES,
  type ReplacementListingStatus,
  type Specialty,
} from "./api";
import type { components } from "./api.gen";

type Wire = components["schemas"];

/** True only when `A` and `B` accept each other. */
type Same<A, B> = A extends B ? (B extends A ? true : false) : false;

type PARITY = [
  Same<Specialty, Wire["Profile"]["specialty"]>,
  Same<ProfileType, Wire["Profile"]["profileType"]>,
  Same<ReplacementListingStatus, Wire["ReplacementListing"]["status"]>,
  Same<ApplicationStatus, Wire["Application"]["status"]>,
  Same<ApplicationDecisionSource | null, Wire["Application"]["decisionSource"]>,
  Same<
    ApplicationRejectionBucket | null,
    Wire["Application"]["rejectionBucket"]
  >,
  Same<
    ApiApplicationStatusCounts,
    NonNullable<Wire["PaginatedApplications"]["meta"]["counts"]>
  >,
  Same<
    ApiApplicationBucketCounts,
    NonNullable<Wire["PaginatedApplications"]["meta"]["bucketCounts"]>
  >,
];

/**
 * One-way: the frontend's vocabulary must exist on the wire, even where its
 * type is stricter (`ApiListingSpecialtyCounts` vs an index signature).
 */
type COVERAGE = [
  Specialty extends Wire["Profile"]["specialty"] ? true : false,
  ProfileType extends Wire["Profile"]["profileType"] ? true : false,
  ReplacementListingStatus extends Wire["ReplacementListing"]["status"]
    ? true
    : false,
  ApplicationStatus extends Wire["Application"]["status"] ? true : false,
  ApplicationDecisionSource extends Wire["Application"]["decisionSource"]
    ? true
    : false,
  ApplicationRejectionBucket extends Wire["Application"]["rejectionBucket"]
    ? true
    : false,
  ApiListingSpecialtyCounts extends Wire["ListingFacets"]["bySpecialty"]
    ? true
    : false,
];

const PARITY_SAYS: PARITY = [true, true, true, true, true, true, true, true];

const COVERAGE_SAYS: COVERAGE = [true, true, true, true, true, true, true];

describe("API contract parity", () => {
  it("says exactly what the document publishes", () => {
    expect(PARITY_SAYS.every(Boolean)).toBe(true);
    expect(COVERAGE_SAYS.every(Boolean)).toBe(true);
  });

  it("keeps the canonical arrays honest against their own lengths", () => {
    expect(APPLICATION_STATUSES.length).toBe(5);
    expect(APPLICATION_DECISION_SOURCES.length).toBe(4);
    expect(APPLICATION_REJECTION_BUCKETS.length).toBe(3);
    expect(REPLACEMENT_LISTING_STATUSES.length).toBe(8);
  });
});
