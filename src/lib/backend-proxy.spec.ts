import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { NextRequest } from "next/server";
import { proxyToBackend } from "./backend-proxy";
import { backendUrl } from "./backend-url.server";

const realFetch = globalThis.fetch;
const env = process.env as Record<string, string | undefined>;
const realEnv = { BACKEND_URL: env.BACKEND_URL, NODE_ENV: env.NODE_ENV };
let calls: Array<{ url: string; init: RequestInit }> = [];
let answer: () => Response | Promise<Response>;

beforeEach(() => {
  calls = [];
  env.BACKEND_URL = "http://backend.internal:4000";
  answer = () => new Response("{}", { status: 200 });
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return answer();
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  env.BACKEND_URL = realEnv.BACKEND_URL;
  env.NODE_ENV = realEnv.NODE_ENV;
});

const stripApi = (pathname: string) => pathname.replace(/^\/api/, "") || "/";

function relay(
  path: string,
  init?: ConstructorParameters<typeof NextRequest>[1],
) {
  return proxyToBackend(
    new NextRequest(`http://app.example${path}`, init),
    stripApi,
    "API",
  );
}

describe("proxyToBackend", () => {
  test("relays the path and query to the backend", async () => {
    await relay("/api/replacement-listings?page=2");

    expect(calls[0]?.url).toBe(
      "http://backend.internal:4000/replacement-listings?page=2",
    );
  });

  test("refuses a method the routes do not export", async () => {
    const response = await relay("/api/profile/me", { method: "OPTIONS" });

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toContain("GET");
    expect(calls).toHaveLength(0);
  });

  test("drops hop-by-hop headers and the host, keeps the reader's address", async () => {
    await relay("/api/profile/me", {
      headers: {
        connection: "keep-alive, x-hop",
        "x-hop": "1",
        "keep-alive": "timeout=5",
        cookie: "session=abc",
        "x-forwarded-for": "203.0.113.7",
      },
    });

    const sent = new Headers(calls[0]?.init.headers);
    expect(sent.has("connection")).toBe(false);
    expect(sent.has("x-hop")).toBe(false);
    expect(sent.has("keep-alive")).toBe(false);
    expect(sent.has("host")).toBe(false);
    expect(sent.get("cookie")).toBe("session=abc");
    expect(sent.get("x-forwarded-for")).toBe("203.0.113.7");
    expect(sent.get("x-forwarded-host")).toBe("app.example");
  });

  test("points a redirect on the backend's origin back at this app", async () => {
    answer = () =>
      new Response(null, {
        status: 302,
        headers: { location: "http://backend.internal:4000/done?x=1" },
      });

    const response = await relay("/api/auth/callback");

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/done?x=1");
  });

  test("leaves a third-party redirect alone", async () => {
    answer = () =>
      new Response(null, {
        status: 302,
        headers: { location: "https://accounts.example/oauth" },
      });

    const response = await relay("/api/auth/callback");

    expect(response.headers.get("location")).toBe(
      "https://accounts.example/oauth",
    );
  });

  test("answers 502 when the backend cannot be reached, 504 when it hangs", async () => {
    // The proxy logs each failure; the log is not what this test is about.
    const logged = spyOn(console, "error").mockImplementation(() => {});

    answer = () => Promise.reject(new TypeError("fetch failed"));
    expect((await relay("/api/profile/me")).status).toBe(502);

    answer = () =>
      Promise.reject(new DOMException("timed out", "TimeoutError"));
    expect((await relay("/api/profile/me")).status).toBe(504);
    expect(logged).toHaveBeenCalledTimes(2);
    logged.mockRestore();
  });
});

describe("backendUrl", () => {
  test("drops a trailing slash", () => {
    env.BACKEND_URL = "http://backend.internal:4000/";
    expect(backendUrl()).toBe("http://backend.internal:4000");
  });

  test("falls back to the local backend in development only", () => {
    env.BACKEND_URL = "";
    env.NODE_ENV = "development";
    expect(backendUrl()).toBe("http://localhost:3000");

    env.NODE_ENV = "production";
    expect(() => backendUrl()).toThrow("BACKEND_URL");
  });
});
