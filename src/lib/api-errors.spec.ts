import { describe, expect, test } from "bun:test";
import { ApiError } from "./api-client";
import { classifyError, errorMessage, neverReached } from "./api-errors";

describe("classifyError", () => {
  test("reads a 401 as an expired session", () => {
    expect(classifyError(new ApiError(401, "/profile/me"))).toBe("session");
  });

  test("reads the proxy's own failures as service-down", () => {
    for (const status of [502, 503, 504]) {
      expect(classifyError(new ApiError(status, "/profile/me"))).toBe(
        "service-down",
      );
    }
  });

  test("keeps a backend 500 apart from a proxy failure", () => {
    expect(classifyError(new ApiError(500, "/profile/me"))).toBe("unavailable");
  });

  test("maps the statuses the screens branch on", () => {
    expect(classifyError(new ApiError(403, "/x"))).toBe("forbidden");
    expect(classifyError(new ApiError(404, "/x"))).toBe("not-found");
    expect(classifyError(new ApiError(409, "/x"))).toBe("conflict");
    expect(classifyError(new ApiError(422, "/x"))).toBe("conflict");
    expect(classifyError(new ApiError(429, "/x"))).toBe("unavailable");
  });

  test("reads field errors as validation before looking at the status", () => {
    const error = new ApiError(400, "/x", "Validation failed", [
      { path: ["email"], message: "Invalid" },
    ]);
    expect(classifyError(error)).toBe("validation");
  });

  test("separates a cut connection from a deadline", () => {
    expect(classifyError(new TypeError("fetch failed"))).toBe("service-down");
    expect(classifyError(new DOMException("timed out", "TimeoutError"))).toBe(
      "unavailable",
    );
    expect(classifyError(new DOMException("aborted", "AbortError"))).toBe(
      "unavailable",
    );
  });

  test("reads an unrecognisable throw as unknown", () => {
    expect(classifyError("boom")).toBe("unknown");
    expect(classifyError({ status: "500" })).toBe("unknown");
  });
});

describe("errorMessage", () => {
  test("prefers a domain override for the kind it recognises", () => {
    expect(
      errorMessage(new ApiError(409, "/x"), {
        conflict: "Cet email est déjà utilisé.",
      }),
    ).toBe("Cet email est déjà utilisé.");
  });

  test("falls back to the default copy for the kind", () => {
    expect(errorMessage(new ApiError(401, "/x"))).toContain("session");
  });
});

describe("neverReached", () => {
  test("is true only when no status was received", () => {
    expect(neverReached(new TypeError("fetch failed"))).toBe(true);
    expect(neverReached(new DOMException("timed out", "TimeoutError"))).toBe(
      true,
    );
    expect(neverReached(new ApiError(500, "/x"))).toBe(false);
  });
});
