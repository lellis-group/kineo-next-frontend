import { notFound, redirect } from "next/navigation";
import { ApiError } from "./api-client";
import { classifyError } from "./api-errors";

/**
 * Runs a read that requires a member; an expired session goes to `/signin`.
 * The proxy only checks that a cookie is present, so this is where validity is
 * learnt. Other failures propagate.
 */
export async function requireMember<T>(work: Promise<T>): Promise<T> {
  try {
    return await work;
  } catch (error) {
    if (classifyError(error) === "session") {
      redirect("/signin");
    }
    throw error;
  }
}

/**
 * As `requireMember`, and an absent row renders the 404 page. 403 is folded in:
 * some endpoints answer "not yours" with 403, others with 404, and a 404 also
 * avoids confirming the id exists. The session check runs first, so a
 * signed-out reader learns nothing about the id.
 */
export async function requireExisting<T>(work: Promise<T>): Promise<T> {
  try {
    return await work;
  } catch (error) {
    if (classifyError(error) === "session") {
      redirect("/signin");
    }
    if (
      error instanceof ApiError &&
      (error.status === 403 || error.status === 404)
    ) {
      notFound();
    }
    throw error;
  }
}
