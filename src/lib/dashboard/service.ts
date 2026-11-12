import type { ApiTransport } from "../api-client";
import { awaitingDecisionCount, fetchApplicationsData } from "../applications";
import { fetchMyListings, recruitingCount } from "../listings";
import { fetchMyProfile } from "../profile-service";
import { adaptActions } from "./action-links";
import { ACTIVITY_FEED_SIZE, adaptActivity } from "./activity";
import type { DashboardData } from "./contracts";
import { adaptGreeting } from "./greeting";
import { adaptReactivity } from "./response-rate";
import { adaptStats } from "./stats";

/** One row: the home screen only needs the listings endpoint's `meta`. */
const LISTINGS_LIMIT = 1;

export async function fetchDashboardData(
  userName?: string,
  transport?: ApiTransport,
): Promise<DashboardData> {
  const [profile, listings, applications] = await Promise.all([
    fetchMyProfile(transport),
    fetchMyListings({ limit: LISTINGS_LIMIT }, transport),
    fetchApplicationsData({ page: 1, limit: ACTIVITY_FEED_SIZE }, transport),
  ]);

  const recruiting = recruitingCount(listings.counts);
  const outstanding = awaitingDecisionCount(applications.counts);

  return {
    greeting: adaptGreeting(profile, userName, {
      recruiting: recruiting > 0,
      outstanding: outstanding > 0,
    }),
    actions: adaptActions(profile?.profileType ?? null),
    stats: adaptStats(listings, applications),
    activity: adaptActivity(applications.applications),
    needsProfile: profile === null,
    reactivity: adaptReactivity(applications),
  };
}
