import { redirect } from "next/navigation";
import { serverTransport } from "./api-transport.server";
import { fetchMyProfile } from "./profile-service";
import { requireMember } from "./require-member";
import { fetchKnownServerAuth, type ServerAuthState } from "./server-auth";

type MemberAuth = Extract<ServerAuthState, { status: "member" }>;

import type { ApiProfile } from "./types/api";

export type ProfileGateMode = "view" | "create" | "edit";

/**
 * Decides whether a profile route may render, and redirects when it may not.
 * Overloaded so `create` is typed as having no profile and `view`/`edit` as
 * always having one.
 */
export async function passProfileGate(
  mode: "view" | "edit",
): Promise<{ auth: MemberAuth; profile: ApiProfile }>;
export async function passProfileGate(
  mode: "create",
): Promise<{ auth: MemberAuth; profile: null }>;
export async function passProfileGate(
  mode: ProfileGateMode,
): Promise<{ auth: MemberAuth; profile: ApiProfile | null }> {
  const [auth, profile] = await Promise.all([
    fetchKnownServerAuth(),
    readProfileFor(mode),
  ]);

  if (auth.status === "anonymous") {
    redirect("/signin");
  }

  switch (mode) {
    case "view":
    case "edit":
      if (!profile) {
        redirect("/profile/create");
      }
      return { auth, profile };

    case "create":
      if (profile) {
        redirect("/profile/edit");
      }
      return { auth, profile: null };
  }
}

/**
 * Only `create` tolerates a failed profile read: on `view`/`edit`, answering
 * "no profile" would offer the create form for a profile that exists.
 */
function readProfileFor(mode: ProfileGateMode): Promise<ApiProfile | null> {
  if (mode === "create") {
    return fetchMyProfile(serverTransport).catch(() => null);
  }
  return requireMember(fetchMyProfile(serverTransport));
}
