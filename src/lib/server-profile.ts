import { headers } from "next/headers";
import { cache } from "react";
import { getSessionCookie } from "./auth";
import type { ApiProfile, ProfileType } from "./types/api";

/** Server-side role for nav. Null = anonymous, onboarding, or unreachable. */
export const fetchServerProfileType = cache(
  async (): Promise<ProfileType | null> => {
    const requestHeaders = await headers();

    // Anonymous: no session cookie, skip network round trip.
    if (!getSessionCookie(requestHeaders)) {
      return null;
    }

    const backendURL = process.env.NEXT_PUBLIC_BACKEND_URL;
    const profileURL = backendURL
      ? `${backendURL}/profile/me`
      : `${requestHeaders.get("x-forwarded-proto") ?? "http"}://${
          requestHeaders.get("host") ?? "localhost:3001"
        }/api/profile/me`;

    try {
      const response = await fetch(profileURL, {
        headers: { cookie: requestHeaders.get("cookie") ?? "" },
        cache: "no-store",
      });
      if (!response.ok) return null;

      const profile = (await response.json()) as ApiProfile | null;
      return profile?.profileType ?? null;
    } catch {
      // Backend unreachable — fall back to generic nav.
      return null;
    }
  },
);
