/**
 * Raw API types — the shapes the Kineo backend answers with.
 *
 * Hand-written, not generated: `templates/api.json` documents the request DTOs
 * only, so every response shape here is transcribed from observed backend
 * output (and, for `ApiUser`, from the backend's Prisma model) rather than from
 * the OpenAPI document. A field added server-side will not appear here until
 * someone reads it off a real response — so treat a missing field as "unknown",
 * not "absent", and prefer a runtime fallback over `!`.
 *
 * Presentation types live beside the adapters that produce them, in
 * `lib/<domain>/contracts.ts`.
 */

/** Better-Auth user (mirrors kineo-nest-backend Prisma User model). */
export interface ApiUser {
  id: string;
  name: string | null;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type Specialty =
  | "GENERALIST"
  | "DENTIST"
  | "DERMATOLOGIST"
  | "PSYCHIATRIST"
  | "OTHER";

export type ProfileType = "INSTALLED" | "REPLACEMENT" | "BOTH";

export interface ApiProfile {
  id: string;
  userId: string;
  specialty: Specialty;
  profileType: ProfileType;
  rppsNumber?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  isPublic?: boolean;
  /**
   * Professional identity checked by the platform (mirrors the backend
   * `Profile.verified`). Distinct from `user.emailVerified`, which only means
   * the address was confirmed.
   */
  verified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ReplacementListingStatus =
  | "DRAFT"
  | "OPEN"
  | "IN_DISCUSSION"
  | "FULL"
  | "FILLED"
  | "CLOSED"
  | "CANCELLED";

export interface ApiReplacementListing {
  id: string;
  practiceId: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: ReplacementListingStatus;
  specialty: Specialty;
  urgent: boolean;
  /** Cap on simultaneous candidates — null when the listing is uncapped. */
  maxApplications?: number | null;
  /** Active candidates (PENDING / SHORTLISTED) held by the listing. */
  applicationsCount: number;
  createdAt: string;
  updatedAt: string;
}

export type ApplicationStatus =
  | "PENDING"
  | "SHORTLISTED"
  | "ACCEPTED"
  | "REJECTED"
  | "WITHDRAWN";

/** Practice data embedded in an application response. */
export interface ApiApplicationPractice {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
}

/** Listing data embedded in an application response. */
export interface ApiApplicationListing {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  specialty: Specialty;
  status: ReplacementListingStatus;
  urgent: boolean;
  description: string | null;
  practice: ApiApplicationPractice;
}

/** Applicant data embedded in the applications a practice received. */
export interface ApiApplicationApplicant {
  id: string;
  specialty: Specialty;
  profileType: ProfileType;
  city: string | null;
  verified: boolean;
  user: {
    name: string | null;
    image: string | null;
  };
  /**
   * The candidate erased their account (art. 17 GDPR). Every field above is
   * then blank by construction, so this is what tells the practice why the
   * card has no name on it.
   */
  anonymized: boolean;
}

export interface ApiApplication {
  id: string;
  listingId: string;
  applicantId: string;
  status: ApplicationStatus;
  message?: string;
  rejectionReason?: string;
  withdrawnReason?: string;
  viewedAt?: string;
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
  /** Listing (with its practice) resolved server-side by the backend. */
  listing?: ApiApplicationListing;
  /** Candidate — only embedded on the applications received by a listing. */
  applicant?: ApiApplicationApplicant;
}

/** Server-computed totals for a collection of applications. */
export interface ApiApplicationStatusCounts {
  /** Count across all statuses — backs the « Toutes » tab. */
  total: number;
  PENDING: number;
  SHORTLISTED: number;
  ACCEPTED: number;
  REJECTED: number;
  WITHDRAWN: number;
}

/**
 * A paginated response.
 *
 * `counts` is deliberately left to each caller rather than typed here: the
 * applications endpoints break their totals down by `ApplicationStatus`, the
 * listings one by `ListingStatus`. A single shared field would have to be the
 * union of both, so picking the wrong one would type-check and then read
 * `undefined` off a status that never existed. Each service names its own
 * shape instead (see `ListingStatusCounts` / `ReceivedApplicationCounts`).
 */
export interface ApiPaginated<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/** The applications page: the slice plus the totals behind its status chips. */
export interface ApiApplicationPage<T> extends ApiPaginated<T> {
  meta: ApiPaginated<T>["meta"] & {
    /** Only the applications endpoints return a breakdown. */
    counts?: Partial<ApiApplicationStatusCounts>;
  };
}
