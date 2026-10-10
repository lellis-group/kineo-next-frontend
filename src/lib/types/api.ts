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

/**
 * Listing lifecycle, in the order a posting moves through it.
 *
 * A const array rather than a bare union so the same list exists at runtime:
 * the zeroed counters that stand in for a response without its breakdown have to
 * enumerate the same statuses, and a hand-copied second list is a silent drift.
 */
export const REPLACEMENT_LISTING_STATUSES = [
  "DRAFT",
  "OPEN",
  "IN_DISCUSSION",
  "FULL",
  "FILLED",
  "CLOSED",
  "CLOSED_NO_CANDIDATE",
  "CANCELLED",
] as const;

export type ReplacementListingStatus =
  (typeof REPLACEMENT_LISTING_STATUSES)[number];

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

/** Const array, not a bare union — see `REPLACEMENT_LISTING_STATUSES`. */
export const APPLICATION_STATUSES = [
  "PENDING",
  "SHORTLISTED",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/**
 * Which outcome ended the application, when one has.
 *
 * The status alone cannot answer the question the applicant actually has: two
 * things land on `REJECTED` — the practice refused this person, or an account was
 * erased — and they read nothing alike. `WITHDRAWN` mixes a self-service
 * withdrawal with one written by the account erasure too.
 *
 * These four are what the backend's `DecisionSource` enum holds, and they are the
 * only four it can ever send. This list used to hold nine, and the extra five were
 * worse than unused: reading it as the vocabulary, the code believed it could
 * name outcomes the database had no way of expressing — another candidate
 * retained, the posting closed or cancelled, a practice that closed its account —
 * while the value the database *does* produce for an erased account had no entry
 * at all, and indexing the label table with it threw. Nobody noticed because the
 * two sides were never compared.
 *
 * Which account was erased is not in this value: `SYSTEM` covers both, and the
 * status tells them apart — `WITHDRAWN` when the candidate erased their own,
 * `REJECTED` when the practice's account went.
 *
 * Null while the application is still open: nobody has decided yet.
 *
 * Const array, not a bare union — see `REPLACEMENT_LISTING_STATUSES`.
 */
export const APPLICATION_DECISION_SOURCES = [
  "CANDIDATE_WITHDREW",
  "PRACTICE_ACCEPTED",
  "PRACTICE_REJECTED",
  "SYSTEM",
] as const;

export type ApplicationDecisionSource =
  (typeof APPLICATION_DECISION_SOURCES)[number];

/**
 * The three situations a rejected application can be.
 *
 * Named by the backend and computed there: `REJECTED` alone covers a practice
 * refusing this person, another candidate being retained, and the posting leaving
 * circulation, and those need three different reactions. The backend derives it
 * from fields it already stores, so the client never re-decides which is which.
 */
export const APPLICATION_REJECTION_BUCKETS = [
  "PASSED_OVER",
  "POSTING_ENDED",
  "REFUSED",
] as const;

export type ApplicationRejectionBucket =
  (typeof APPLICATION_REJECTION_BUCKETS)[number];

/**
 * Per-situation totals, over the whole collection.
 *
 * Optional because an older backend does not send it; every reader fills the gap
 * with 0, which shows an empty chip rather than a broken page.
 */
export type ApiApplicationBucketCounts = Record<
  ApplicationRejectionBucket,
  number
>;

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
  /** Who decided. Null while the application is still open. */
  decisionSource?: ApplicationDecisionSource | null;
  message?: string;
  rejectionReason?: string;
  /**
   * Which situation a rejection is, or null when it is none of them — a pending
   * application, or one an erasure settled.
   *
   * Optional in the type for the same reason as `bucketCounts`: `undefined` from an
   * older backend is read as null, never as a bucket nobody assigned.
   */
  rejectionBucket?: ApplicationRejectionBucket | null;
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

/**
 * One counter per value of `S`, plus the `total` across all of them.
 *
 * Generic over the key set because the API serves three different breakdowns —
 * by application status, by listing status, by decision source — and they all
 * have this shape. The wire type and the presentation contract that describe a
 * given breakdown stay separately named, being different layers, but both are
 * written this way so they cannot drift apart in shape.
 *
 * See `lib/counts.ts` for the zeroed stand-in used when a response carries no
 * breakdown.
 */
export type StatusCounts<S extends string> = Record<S | "total", number>;

/** Server-computed totals for a collection of applications, by status. */
export type ApiApplicationStatusCounts = StatusCounts<ApplicationStatus>;

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
    /** Per-situation totals for the rejected applications. Absent on older backends. */
    bucketCounts?: Partial<ApiApplicationBucketCounts>;
  };
}
