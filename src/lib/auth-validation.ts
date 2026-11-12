/**
 * Client-side mirrors of the backend's input rules
 * (`kineo-nest-backend/src/lib/auth/schemas.ts`), for instant feedback; the
 * server stays the source of truth.
 */

export const EMAIL_MAX_LENGTH = 254;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const NAME_MAX_LENGTH = 50;
/** Letters (any script), spaces, apostrophes and hyphens only — mirrors the backend regex. */
export const NAME_PATTERN = "^[\\p{L}\\s'-]+$";
export const NAME_PATTERN_REGEX = /^[\p{L}\s'-]+$/u;

export const IMAGE_MAX_LENGTH = 2048;

/** Messages kept identical to the backend validation errors. */
export const NAME_ERROR_MESSAGE =
  "Le nom contient des caractères non autorisés.";
export const PASSWORD_LENGTH_MESSAGE =
  "Le mot de passe doit contenir entre 8 et 128 caractères.";
export const EMAIL_ERROR_MESSAGE = "Adresse e-mail invalide.";
export const IMAGE_HTTPS_ERROR_MESSAGE =
  "URL d'image invalide : le lien doit commencer par https://.";

/** Normalizes an email the way the backend does (trim + lowercase). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Name rule: trimmed, 1–50 chars, letters/spaces/apostrophes/hyphens only. */
export function isValidName(name: string): boolean {
  const trimmed = name.trim();
  return (
    trimmed.length >= 1 &&
    trimmed.length <= NAME_MAX_LENGTH &&
    NAME_PATTERN_REGEX.test(trimmed)
  );
}

/** Password set rule: between 8 and 128 characters. */
export function isValidPasswordLength(password: string): boolean {
  const length = password.length;
  return length >= PASSWORD_MIN_LENGTH && length <= PASSWORD_MAX_LENGTH;
}

/** Image rule: HTTPS absolute URL only (backend `z.url({ protocol: /^https$/ })`). */
export function isValidHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
