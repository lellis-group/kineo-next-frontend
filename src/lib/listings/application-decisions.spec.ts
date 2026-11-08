/**
 * The practice's decisions on one received application — the request each
 * write lands, and the French a refusal is reported in.
 *
 * The statuses that gate the four writes live with the backend; what this
 * spec pins is that each write goes to the route the document publishes, and
 * that every refusal the backend names has a distinct sentence in front of
 * the card it belongs to.
 */
import { describe, expect, test } from "bun:test";
import { ApiError, type ApiTransport } from "../api-client";
import {
  APPLICATION_DECISION_CODES,
  applicationDecisionErrorMessage,
} from "./application-decision-errors";
import {
  acceptReceivedApplication,
  markApplicationViewed,
  rejectReceivedApplication,
  shortlistReceivedApplication,
} from "./service";

const APPLICATION_ID = "apps0000000000000000aaaaaa";

/** A refusal the way the backend sends it. */
function refusal(
  status: number,
  code?: string,
  message = "Something in English the client must not parse",
): ApiError {
  return new ApiError(status, "/applications/x", message, undefined, code);
}

/** Records what was asked, answers nothing — the shape audit and this agree on. */
function recorder(seen: string[]): ApiTransport {
  return (path, init) => {
    seen.push(`${init?.method ?? "GET"} ${path}`);
    return Promise.reject(new Error("spec stops here"));
  };
}

describe("received-application decisions", () => {
  test("each write lands on the route the document publishes", async () => {
    const one = async (
      work: (seen: string[]) => Promise<unknown>,
    ): Promise<string[]> => {
      const seen: string[] = [];
      await work(seen).catch(() => {});
      return seen;
    };

    const [viewed, shortlisted, accepted, rejected] = await Promise.all([
      one((seen) => markApplicationViewed(APPLICATION_ID, recorder(seen))),
      one((seen) =>
        shortlistReceivedApplication(APPLICATION_ID, recorder(seen)),
      ),
      one((seen) => acceptReceivedApplication(APPLICATION_ID, recorder(seen))),
      one((seen) =>
        rejectReceivedApplication(APPLICATION_ID, undefined, recorder(seen)),
      ),
    ]);

    expect(viewed).toEqual([`PATCH /applications/${APPLICATION_ID}/view`]);
    expect(shortlisted).toEqual([
      `PATCH /applications/${APPLICATION_ID}/shortlist`,
    ]);
    expect(accepted).toEqual([`PATCH /applications/${APPLICATION_ID}/accept`]);
    expect(rejected).toEqual([
      `PATCH /applications/${APPLICATION_ID}/reject`,
      // No reason, no object: an empty payload does not travel.
    ]);
  });

  test("sends the trimmed reason only when the practice wrote one", async () => {
    const seen: Array<{ path: string; body: string }> = [];
    await rejectReceivedApplication(
      APPLICATION_ID,
      "  Autre profil retenu  ",
      (path, init) => {
        seen.push({ path, body: String(init?.body ?? "") });
        return Promise.reject(new Error("spec stops here"));
      },
    ).catch(() => {});

    expect(JSON.parse(seen[0]?.body ?? "{}")).toEqual({
      rejectionReason: "Autre profil retenu",
    });
  });
});

describe("applicationDecisionErrorMessage", () => {
  test("keeps a distinct sentence per refusal code", () => {
    const codes = Object.values(APPLICATION_DECISION_CODES);
    const sentences = codes.map((code) =>
      applicationDecisionErrorMessage(refusal(400, code)),
    );

    expect(new Set(sentences).size).toBe(codes.length);
    for (const [index, code] of codes.entries()) {
      expect(sentences[index], code).not.toContain("English");
    }
  });

  test("answers the statuses the backend sends without a code", () => {
    expect(applicationDecisionErrorMessage(refusal(404))).toBe(
      "Cette candidature n'existe plus.",
    );
    expect(applicationDecisionErrorMessage(refusal(403))).toBe(
      "Vous ne pouvez plus agir sur cette candidature.",
    );
  });

  test("lets the generic copy stand for faults worth retrying", () => {
    expect(applicationDecisionErrorMessage(refusal(500))).not.toContain(
      "English",
    );
    expect(applicationDecisionErrorMessage(refusal(401))).toContain("session");
  });
});
