import { apiFetch, extractList, notFoundAs } from "../api-client";
import type {
  ApiApplication,
  ApiPaginated,
  ApiProfile,
  ApiReplacementListing,
} from "../types/api";
import { adaptActions } from "./actions";
import { adaptActivity } from "./activity";
import type { DashboardData } from "./contracts";
import { adaptGreeting } from "./greeting";
import { adaptReactivity } from "./reactivity";
import { adaptStats } from "./stats";

// Soft 404: profile, listings, applications may not exist yet (onboarding).
async function fetchProfile(): Promise<ApiProfile | null> {
  return apiFetch<ApiProfile>("/profile/me").catch(notFoundAs(null));
}

async function fetchMyListings(): Promise<ApiReplacementListing[]> {
  const raw = await apiFetch<
    ApiPaginated<ApiReplacementListing> | ApiReplacementListing[]
  >("/replacement-listings/mine").catch(notFoundAs([]));
  return extractList(raw);
}

async function fetchMyApplications(): Promise<ApiApplication[]> {
  const raw = await apiFetch<ApiPaginated<ApiApplication> | ApiApplication[]>(
    "/applications/mine",
  ).catch(notFoundAs([]));
  return extractList(raw);
}

export async function fetchDashboardData(
  userName?: string,
): Promise<DashboardData> {
  const [profile, listings, applications] = await Promise.all([
    fetchProfile(),
    fetchMyListings(),
    fetchMyApplications(),
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
