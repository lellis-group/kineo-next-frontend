import type { ApiTransport } from "../api-client";
import { awaitingDecisionCount, fetchApplicationsData } from "../applications";
import { fetchMyListings, recruitingCount } from "../listings";
import { fetchMyProfile } from "../profile-service";
import { adaptActions } from "./actions";
import { ACTIVITY_FEED_SIZE, adaptActivity } from "./activity";
import type { DashboardData } from "./contracts";
import { adaptGreeting } from "./greeting";
import { adaptReactivity } from "./reactivity";
import { adaptStats } from "./stats";

/**
 * Why the listings read asks for one row.
 *
 * Nothing on the home screen is derived from them: the counters come from the
 * endpoint's own totals, and « Prochain remplacement » is answered beside them,
 * over the whole collection, by the server. One row is what it takes to carry a
 * page's worth of `meta`.
 *
 * This read used to page the member's whole collection — up to twenty requests,
 * on every visit — to count figures the endpoints already count, and to compute
 * them correctly only until the twentieth page.
 */
const LISTINGS_LIMIT = 1;

export async function fetchDashboardData(
  userName?: string,
  transport?: ApiTransport,
): Promise<DashboardData> {
  // `fetchMyProfile` answers a missing profile with null (onboarding, not an
  // error) — the same soft-404 policy the other screens read it under.
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
