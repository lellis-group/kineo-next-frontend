/**
 * User account service — fetch and update the current user's account info
 * (Better-Auth managed: name, image, email, emailVerified).
 */

import { errorMessage } from "./api-errors";
import { authClient } from "./auth-client";
import type { ApiUser } from "./types/api";

/** GET /get-session — returns the current user. */
async function fetchUserInfo(): Promise<ApiUser> {
  const { data, error } = await authClient.getSession();
  if (error || !data?.user) {
    throw error ?? new Error("Failed to fetch user info");
  }
  return data.user as unknown as ApiUser;
}

/** POST /update-user — updates name and/or image. */
export async function updateUserInfo(payload: {
  name?: string;
  image?: string | null;
}): Promise<ApiUser> {
  const { error } = await authClient.updateUser(payload);
  if (error) {
    throw error;
  }
  return fetchUserInfo();
}

/**
 * POST /change-email — requests an email change. Nothing is applied yet.
 *
 * Two steps, and which one starts depends on the account: when the current
 * address is verified, better-auth asks *it* to approve the change and only then
 * emails the new address; when it is not, there is nothing to prove, so the new
 * address is emailed straight away. The wording below names both, because saying
 * "we emailed the new address" is false in the first case — and an unverified
 * account is every account while the backend ships with verification off.
 */
export async function changeEmail(newEmail: string): Promise<{
  user: ApiUser;
  message: string;
}> {
  const { data, error } = await authClient.changeEmail({ newEmail });
  if (error) {
    throw error;
  }
  const message =
    (data as { message?: string }).message === "Email updated"
      ? "Email mis à jour."
      : "Demande enregistrée. Un email de confirmation part soit vers votre adresse actuelle pour approuver le changement, soit directement vers la nouvelle adresse si celle-ci n'a jamais été vérifiée. Le changement n'est appliqué qu'après ces confirmations.";
  const user = (data as { user?: ApiUser }).user;
  if (user) {
    return { user: user as ApiUser, message };
  }
  return { user: await fetchUserInfo(), message };
}

/**
 * Maps an account-update failure to a user-facing French message.
 *
 * The backend's own `message` is deliberately not passed through: better-auth
 * reports these in English ("User already exists"), and every screen here is
 * French. The status is the only trustworthy part.
 */
export function mapUserError(error: unknown): string {
  return errorMessage(error, {
    conflict: "Cet email est déjà utilisé.",
    unavailable:
      "Impossible de mettre à jour vos informations. Veuillez réessayer.",
    "service-down":
      "Le service est hors service : vos informations n'ont pas été enregistrées. Réessayez dans quelques minutes.",
  });
}

/**
 * POST /delete-user — requests account erasure. Better Auth emails a
 * confirmation link (valid 24h) to the account address; the account is only
 * anonymized once that link is opened (see /goodbye), and the request is
 * refused while other candidates still hold active applications on the
 * account's listings. The email warns about that case upfront.
 */
export async function deleteAccount(): Promise<void> {
  const { error } = await authClient.deleteUser();
  if (error) {
    throw new Error(mapDeleteAccountError(error));
  }
}

/**
 * Maps a delete-account failure to a user-facing French message.
 *
 * The backend refuses an erasure that was requested from a session which has
 * since been rotated. That is recoverable — sign out, sign in, ask again — so it
 * is told apart from the cases where retrying changes nothing.
 */
function mapDeleteAccountError(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string" &&
    /session/i.test((error as { message: string }).message)
  ) {
    return "Votre session est trop ancienne pour valider une suppression. Déconnectez-vous, reconnectez-vous, puis relancez la demande.";
  }
  return errorMessage(error, {
    unavailable:
      "Impossible d'envoyer la demande de suppression. Veuillez réessayer plus tard.",
    "service-down":
      "Le service est hors service : la demande n'a pas été envoyée. Réessayez dans quelques minutes.",
  });
}
