import { type ApiTransport, fetchAllPages } from "../api-client";
import { fetchMyProfile } from "../profile-service";
import type { ApiApplication, ApiReplacementListing } from "../types/api";
import { adaptActions } from "./actions";
import { adaptActivity } from "./activity";
import type { DashboardData } from "./contracts";
import { adaptGreeting } from "./greeting";
import { adaptReactivity } from "./reactivity";
import { adaptStats } from "./stats";

/**
 * Every page, not just the first: the greeting, the stats and the reactivity
 * panel all count over the whole collection, and a single request would cap them
 * at the server's default page size.
 *
 * These reads are deliberately *not* `fetchMyListings` / `fetchApplicationsData`
 * from the other domains: those return one filtered page plus server-computed
 * counts, which is what a list screen wants. The dashboard needs the rows
 * themselves, because it derives its own totals from them. Same endpoints, two
 * genuinely different shapes.
 */
async function fetchMyListings(
  transport?: ApiTransport,
): Promise<ApiReplacementListing[]> {
  return fetchAllPages<ApiReplacementListing>(
    "/replacement-listings/mine",
    {},
    transport,
  );
}

async function fetchMyApplications(
  transport?: ApiTransport,
): Promise<ApiApplication[]> {
  return fetchAllPages<ApiApplication>("/applications/mine", {}, transport);
}

export async function fetchDashboardData(
  userName?: string,
  transport?: ApiTransport,
): Promise<DashboardData> {
  // `fetchMyProfile` answers a missing profile with null (onboarding, not an
  // error) — the same soft-404 policy the other screens read it under.
  const [profile, listings, applications] = await Promise.all([
    fetchMyProfile(transport),
    fetchMyListings(transport),
    fetchMyApplications(transport),
  ]);

  return {
    greeting: adaptGreeting(profile, userName, listings, applications),
    actions: adaptActions(profile?.profileType ?? null),
    stats: adaptStats(listings, applications),
    activity: adaptActivity(applications, listings),
    needsProfile: profile === null,
    reactivity: adaptReactivity(applications),
  };
}
