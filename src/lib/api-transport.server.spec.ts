import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

/** What `headers()` hands over; `mock.module` must run before the import. */
let incoming = new Headers();
mock.module("next/headers", () => ({ headers: async () => incoming }));

const { serverTransport } = await import("./api-transport.server");

const realFetch = globalThis.fetch;
const realBackendUrl = process.env.BACKEND_URL;
let calls: Array<{ url: string; init: RequestInit }> = [];

beforeEach(() => {
  calls = [];
  process.env.BACKEND_URL = "http://backend.internal:4000/";
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response("{}");
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  process.env.BACKEND_URL = realBackendUrl;
});

function sentHeaders(): Headers {
  return new Headers(calls[0]?.init.headers);
}

describe("serverTransport", () => {
  test("calls the backend directly, whatever Host the request claims", async () => {
    incoming = new Headers({
      host: "169.254.169.254",
      "x-forwarded-proto": "https",
    });

    await serverTransport("/profile/me");

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("http://backend.internal:4000/profile/me");
  });

  test("forwards the reader's cookie and address, and nothing is cached", async () => {
    incoming = new Headers({
      cookie: "better-auth.session_token=abc",
      "x-forwarded-for": "203.0.113.7",
    });

    await serverTransport("/applications/mine");

    expect(sentHeaders().get("cookie")).toBe("better-auth.session_token=abc");
    expect(sentHeaders().get("x-forwarded-for")).toBe("203.0.113.7");
    expect(calls[0]?.init.cache).toBe("no-store");
  });

  test("keeps the caller's headers, a Headers instance included", async () => {
    incoming = new Headers();

    await serverTransport("/profile/me", {
      headers: new Headers({ Accept: "application/json" }),
    });

    expect(sentHeaders().get("accept")).toBe("application/json");
    // No address was declared, so none is invented.
    expect(sentHeaders().has("x-forwarded-for")).toBe(false);
  });
});
