import { describe, expect, test } from "bun:test";
import { ApiError } from "../api-client";
import {
  LISTING_TRANSITION_CODES,
  listingActionErrorMessage,
} from "./listing-errors";
import type { ListingActionKind } from "./service";

/** A refusal as the backend sends it: a 400 carrying a code and English prose. */
function refusal(
  code: string,
  message = "Something in English the client must not parse",
): ApiError {
  return new ApiError(
    400,
    "/replacement-listings/x/close",
    message,
    undefined,
    code,
  );
}

const ACTIONS: ListingActionKind[] = ["close", "cancel"];

describe("listingActionErrorMessage", () => {
  test("names the refused action, in French", () => {
    const messages = ACTIONS.map((action) =>
      listingActionErrorMessage(
        refusal(LISTING_TRANSITION_CODES.NOT_CLOSEABLE),
        action,
      ),
    );

    for (const [index, message] of messages.entries()) {
      const action = ACTIONS[index];
      expect(message, action).toContain("Impossible de");
      expect(message, action).not.toContain("English");
      // The sentence names the action that was refused: « clôturee » is not
      // French, and a sentence about closing shown on a cancel is wrong.
      expect(message, action).toContain(
        action === "close" ? "clôturer" : "annuler",
      );
    }
  });

  test("keeps a distinct sentence per refusal code", () => {
    const codes = Object.values(LISTING_TRANSITION_CODES);
    const sentences = codes.map((code) =>
      listingActionErrorMessage(refusal(code), "close"),
    );

    expect(new Set(sentences).size).toBe(codes.length);
  });

  test("ignores the English message and reads the code alone", () => {
    // The wording changed on the server when `close` became reachable from a
    // listing still recruiting; a client matching the prose stopped translating
    // and told the practice to retry a posting that was already terminal.
    const reworded = refusal(
      LISTING_TRANSITION_CODES.NOT_CLOSEABLE,
      "Only a listing still in circulation can be closed",
    );
    expect(listingActionErrorMessage(reworded, "close")).toBe(
      listingActionErrorMessage(
        refusal(LISTING_TRANSITION_CODES.NOT_CLOSEABLE),
        "close",
      ),
    );
  });

  test("covers the terminal statuses a cancel is refused for, without advice that would be wrong for one of them", () => {
    // `LISTING_ALREADY_CLOSED` is what the backend answers for a filled listing
    // now, where it once sent its own code; « Clôturez-la à la place » would be
    // nonsense on a listing that is already closed.
    const message = listingActionErrorMessage(
      refusal(LISTING_TRANSITION_CODES.ALREADY_CLOSED),
      "cancel",
    );
    expect(message).toContain("annuler");
    expect(message).not.toContain("Clôturez-la");
  });

  test("reads a 404 as a listing that is gone, not as a failure to retry", () => {
    expect(
      listingActionErrorMessage(
        new ApiError(404, "/replacement-listings/x"),
        "close",
      ),
    ).toBe("Cette annonce n'existe plus.");
  });

  test("names both reasons of a 403, and never advises a retry there", () => {
    const message = listingActionErrorMessage(
      new ApiError(403, "/replacement-listings/x/close"),
      "close",
    );
    expect(message).toContain("propriétaire");
    expect(message).toContain("e-mail");
    expect(message).not.toContain("Réessayer");
  });

  test("reads a 409 as someone else's application blocking the cascade", () => {
    // Thrown by `common/application-guard.ts` as a bare ConflictException: no
    // code on the wire, so this one can only be answered by status.
    expect(
      listingActionErrorMessage(
        new ApiError(409, "/replacement-listings/x"),
        "close",
      ),
    ).toContain("candidatures d'autres candidats");
  });

  test("does not tell the practice to retry a refusal it does not recognise", () => {
    const message = listingActionErrorMessage(
      refusal("LISTING_SOMETHING_NEW", "A refusal nobody has translated yet"),
      "close",
    );
    expect(message).toContain("état actuel");
    expect(message).not.toContain("Réessayer");
  });

  test("keeps the outage sentences, which name the action that did not happen", () => {
    expect(
      listingActionErrorMessage(
        new ApiError(503, "/replacement-listings/x/close"),
        "close",
      ),
    ).toContain("n'a pas été clôturée");
    expect(
      listingActionErrorMessage(
        new ApiError(503, "/replacement-listings/x/cancel"),
        "cancel",
      ),
    ).toContain("n'a pas été annulée");
  });

  test("falls back for a failure that never reached the backend", () => {
    const message = listingActionErrorMessage(
      new TypeError("fetch failed"),
      "close",
    );
    expect(message.length).toBeGreaterThan(0);
    expect(message).not.toContain("fetch failed");
  });
});
