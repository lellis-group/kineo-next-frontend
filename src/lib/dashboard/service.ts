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
 * How many listings the home screen reads, and why it reads any.
 *
 * The counters it shows come from the endpoint's own totals, so one row would be
 * enough for them. « Prochain remplacement » is the exception: it asks for the
 * soonest period still to come, which a breakdown of statuses cannot answer. One
 * bounded page is what that costs, at the endpoint's maximum page size.
 *
 * This replaced a walk of up to twenty pages of a hundred rows, on every visit,
 * to compute figures the backend already sends — and to compute them correctly
 * only until the twentieth page.
 */
const LISTINGS_LIMIT = 100;

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
