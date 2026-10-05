import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The real module reads secrets and is server-only; tests hand it a fake store.
const store = {
  eval: vi.fn(async () => 3),
  mget: vi.fn(async () => [3, 1] as unknown[]),
};
vi.mock("@/lib/redis", () => ({ getReader: () => store, getWriter: () => store }));

const { GET, POST } = await import("@/app/api/pings/route");

const post = (origin: string | null) =>
  POST(
    new Request("https://one-light-day.vercel.app/api/pings", {
      method: "POST",
      headers: { host: "one-light-day.vercel.app", ...(origin ? { origin } : {}) },
    }),
  );

describe("/api/pings", () => {
  beforeEach(() => vi.stubEnv("PING_SALT", "test-salt"));
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("lets Vercel's CDN share GETs for a minute but tells browsers not to cache", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("vercel-cdn-cache-control")).toBe("max-age=60, stale-while-revalidate=300");
    expect(await res.json()).toMatchObject({ total: 3 });
  });

  it("answers a ping with the fresh counts, read back after the write", async () => {
    const res = await post("https://one-light-day.vercel.app");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(body.total).toBe(3);
    expect(Array.isArray(body.hours)).toBe(true);
    expect(store.eval).toHaveBeenCalledTimes(1);
    expect(store.mget).toHaveBeenCalledTimes(1);
  });

  it("refuses pings from other sites and from scripts without an Origin", async () => {
    expect((await post("https://evil.example")).status).toBe(403);
    expect((await post(null)).status).toBe(403);
    expect(store.eval).not.toHaveBeenCalled();
  });

  it("reports a throttled sender as 429", async () => {
    store.eval.mockResolvedValueOnce(-1);
    expect((await post("https://one-light-day.vercel.app")).status).toBe(429);
  });

  it("stays shut when the salt is missing", async () => {
    vi.stubEnv("PING_SALT", "");
    expect((await post("https://one-light-day.vercel.app")).status).toBe(503);
  });
});
