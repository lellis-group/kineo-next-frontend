/**
 * The apply write: its request, the entry it returns (from a bare 201 row with
 * no embedded listing), and the French for a refusal.
 */
import { describe, expect, it } from "bun:test";
import { ApiError, type ApiTransport } from "../api-client";
import type { ApiApplication } from "../types/api";
import { adaptApplicationEntry } from "./adapters";
import {
  APPLICATION_CREATE_CODES,
  APPLY_SUCCESS,
  applyErrorMessage,
} from "./apply-errors";
import { applyToListing } from "./service";

const LISTING_ID = "cm5listing0000000abcdefghi";

/** A bare application, as a create answers it; typed against the generated wire. */
function submittedApplication(
  over: Partial<ApiApplication> = {},
): ApiApplication {
  return {
    id: "cm5app000000000abcdefghi",
    listingId: LISTING_ID,
    applicantId: "cm5prof00000000abcdefghi",
    status: "PENDING",
    decisionSource: null,
    message: null,
    rejectionReason: null,
    rejectionBucket: null,
    withdrawnReason: null,
    viewedAt: null,
    respondedAt: null,
    createdAt: "2026-11-08T08:00:00.000Z",
    updatedAt: "2026-11-08T08:00:00.000Z",
    ...over,
  } satisfies ApiApplication;
}

/** Records the request and answers nothing. */
function recording(transport: {
  seen: Array<{ path: string; method: string; body: string }>;
}): ApiTransport {
  return (path, init) => {
    transport.seen.push({
      path,
      method: init?.method ?? "GET",
      body: String(init?.body ?? ""),
    });
    return Promise.reject(new Error("spec stops here"));
  };
}

describe("applyToListing", () => {
  it("posts the listing id and no empty message", async () => {
    const seen: Array<{ path: string; method: string; body: string }> = [];
    await applyToListing(LISTING_ID, "   ", recording({ seen })).catch(
      () => {},
    );

    expect(seen).toHaveLength(1);
    expect(seen[0]?.method).toBe("POST");
    expect(seen[0]?.path).toBe("/applications");
    expect(JSON.parse(seen[0]?.body ?? "{}")).toEqual({
      listingId: LISTING_ID,
    });
  });

  it("sends the trimmed message when the candidate wrote one", async () => {
    const seen: Array<{ path: string; method: string; body: string }> = [];
    await applyToListing(
      LISTING_ID,
      "  Disponible en janvier  ",
      recording({ seen }),
    ).catch(() => {});

    expect(JSON.parse(seen[0]?.body ?? "{}")).toEqual({
      listingId: LISTING_ID,
      message: "Disponible en janvier",
    });
  });

  it("adapts the bare 201 body into a full entry, listing fallback included", () => {
    const entry = adaptApplicationEntry(submittedApplication());

    expect(entry.id).toBe("cm5app000000000abcdefghi");
    expect(entry.status).toBe("PENDING");
    expect(entry.decisionSource).toBeNull();
    expect(entry.listing.id).toBe(LISTING_ID);
    expect(entry.listing.title).not.toHaveLength(0);
  });
});

/** A refusal the way the backend sends it: status, path, prose — and a code when it has one. */
function refusal(
  status: number,
  code?: string,
  message = "Something in English the client must not parse",
): ApiError {
  return new ApiError(status, "/applications", message, undefined, code);
}

describe("applyErrorMessage", () => {
  it("says already-applied for the 409, whatever its English prose", () => {
    expect(applyErrorMessage(refusal(409))).toBe(
      "Vous avez déjà postulé à cette annonce.",
    );
  });

  it("names a gone listing rather than offering a retry", () => {
    expect(applyErrorMessage(refusal(404))).toBe(
      "Cette annonce n'existe plus ou n'est plus accessible.",
    );
  });

  it("keeps a distinct sentence per refusal code", () => {
    const codes = Object.values(APPLICATION_CREATE_CODES);
    const sentences = codes.map((code) =>
      applyErrorMessage(refusal(400, code)),
    );

    expect(new Set(sentences).size).toBe(codes.length);
    for (const code of codes) {
      const french = applyErrorMessage(refusal(400, code));
      expect(french, code).not.toContain("English");
    }
  });

  it("answers the bare 403 with what the reader cannot do, not a guessed reason", () => {
    expect(applyErrorMessage(refusal(403))).toBe(
      "Vous ne pouvez pas postuler à cette annonce.",
    );
  });

  it("lets the generic copy stand for faults the reader can act on", () => {
    const messages = [400, 401, 500].map((status) =>
      applyErrorMessage(refusal(status)),
    );
    for (const message of messages) {
      expect(message).not.toBe("");
    }
    expect(applyErrorMessage(refusal(401))).toContain("session");
  });

  it("reports the success sentence once, where the card needs it", () => {
    expect(APPLY_SUCCESS).toContain("envoyée");
  });
});
