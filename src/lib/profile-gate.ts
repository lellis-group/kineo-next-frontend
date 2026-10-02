import { redirect } from "next/navigation";
import { serverTransport } from "./api-transport.server";
import { fetchMyProfile } from "./profile-service";
import { requireMember } from "./require-member";
import { fetchServerAuth, type ServerAuthState } from "./server-auth";

/**
 * The member variant only.
 *
 * `fetchServerAuth` can answer "anonymous", and this function answers that by
 * redirecting — so the anonymous case never reaches a caller. Returning it
 * narrowed spares every page a check it could not pass anyway.
 */
type MemberAuth = Extract<ServerAuthState, { status: "member" }>;

import type { ApiProfile } from "./types/api";

/**
 * Which of the three profile routes is being entered.
 *
 * All three answer the same two questions — is there a session, is there a
 * profile — and all three redirect on a surprising answer, so the questions and
 * the redirects were written out three times.
 */
export type ProfileGateMode = "view" | "create" | "edit";

/**
 * Decides whether a profile route may render, and redirects when it may not.
 *
 * Overloaded rather than returning `ApiProfile | null` for every mode, so that
 * `create` is typed as *always* having no profile and `view`/`edit` as *always*
 * having one. That is not decoration: the containers on either side take a
 * required profile, and a plain union would have left each page to narrow a null
 * it had already been redirected away from — which is exactly the check this
 * function exists to make once.
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
    fetchServerAuth(),
    readProfileFor(mode),
  ]);

  if (auth.status === "anonymous") {
    // `redirect` never returns, which is what lets `auth` be returned narrowed.
    redirect("/signin");
  }

  switch (mode) {
    case "view":
    case "edit":
      // Reachable only from a valid session that has a profile.
      if (!profile) {
        redirect("/profile/create");
      }
      return { auth, profile };

    case "create":
      // Reachable only from a valid session that has none.
      if (profile) {
        redirect("/profile/edit");
      }
      return { auth, profile: null };
  }
}

/**
 * The profile, or null when this mode is allowed to carry on without one.
 *
 * The asymmetry between the modes is the whole reason this is not three copies
 * of one function, so it is stated rather than smoothed over: **only `create`
 * tolerates a profile read that fails**. On `edit` and `view` a failure means the
 * session was revoked, and answering "no profile" there would offer a member who
 * signed in on another device the create form — which would then fail with
 * « numéro RPPS déjà utilisé » for a profile that still exists. On `create` a
 * genuine outage is harmless: the form is what the page is for, and the submit
 * reports whatever actually goes wrong.
 *
 * `requireMember` re-throws anything that is not a 401, so on `view` and `edit`
 * an outage still reaches the error boundary rather than being mistaken for an
 * absent profile.
 */
function readProfileFor(mode: ProfileGateMode): Promise<ApiProfile | null> {
  if (mode === "create") {
    return fetchMyProfile(serverTransport).catch(() => null);
  }
  return requireMember(fetchMyProfile(serverTransport));
}
