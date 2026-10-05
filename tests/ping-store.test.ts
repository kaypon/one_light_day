import { describe, expect, it } from "vitest";
import { MONTHLY_CAP, THROTTLE_SEC, hashIp, isSameOrigin, readPings, recordPing, type PingStore } from "@/lib/pingStore";

class FakeStore implements PingStore {
  calls: { op: string; keys: string[]; args?: string[] }[] = [];
  constructor(
    private evalResult: unknown = 1,
    private mgetResult: unknown[] = [],
  ) {}
  async eval(_script: string, keys: string[], args: string[]) {
    this.calls.push({ op: "eval", keys, args });
    return this.evalResult;
  }
  async mget(...keys: string[]) {
    this.calls.push({ op: "mget", keys });
    return this.mgetResult;
  }
}

const NOW = Date.UTC(2026, 9, 10, 12, 30);
const HOUR = 3_600_000;

describe("isSameOrigin", () => {
  it("accepts a browser POST from the page's own origin", () => {
    expect(isSameOrigin("https://one-light-day.vercel.app", "one-light-day.vercel.app")).toBe(true);
    expect(isSameOrigin("http://localhost:3100", "localhost:3100")).toBe(true);
  });

  it("rejects other sites, missing origins and junk", () => {
    expect(isSameOrigin("https://evil.example", "one-light-day.vercel.app")).toBe(false);
    expect(isSameOrigin(null, "one-light-day.vercel.app")).toBe(false);
    expect(isSameOrigin("null", "one-light-day.vercel.app")).toBe(false);
    expect(isSameOrigin("https://one-light-day.vercel.app", null)).toBe(false);
  });
});

describe("hashIp", () => {
  it("returns a salted, fixed-length hash that never contains the address", () => {
    const a = hashIp("203.0.113.7", "salt-one");
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).toBe(hashIp("203.0.113.7", "salt-one"));
    expect(a).not.toBe(hashIp("203.0.113.7", "salt-two"));
    expect(a).not.toContain("203");
  });
});

describe("recordPing", () => {
  it("runs one script with the throttle, month, hour and total keys", async () => {
    const store = new FakeStore(42);
    const result = await recordPing(store, "abc123", NOW);
    expect(result).toEqual({ ok: true, total: 42 });
    expect(store.calls).toEqual([
      {
        op: "eval",
        keys: ["rl:abc123", "pings:m:2026-10", `pings:h:${Date.UTC(2026, 9, 10, 12)}`, "pings:total"],
        args: [String(THROTTLE_SEC), String(MONTHLY_CAP), String(50 * 3600)],
      },
    ]);
  });

  it("reports a throttled sender and a full month", async () => {
    expect(await recordPing(new FakeStore(-1), "abc", NOW)).toEqual({ ok: false, reason: "throttled" });
    expect(await recordPing(new FakeStore(-2), "abc", NOW)).toEqual({ ok: false, reason: "full" });
  });
});

describe("readPings", () => {
  it("reads the total and the last 48 hourly buckets in one call", async () => {
    const values = [17, 3, null, "2", ...Array(45).fill(null)];
    const store = new FakeStore(0, values);
    const data = await readPings(store, NOW);

    expect(store.calls).toHaveLength(1);
    expect(store.calls[0].keys).toHaveLength(49);
    expect(store.calls[0].keys[0]).toBe("pings:total");
    expect(store.calls[0].keys[1]).toBe(`pings:h:${Date.UTC(2026, 9, 10, 12)}`);
    expect(data).toEqual({
      total: 17,
      hours: [
        { startMs: Date.UTC(2026, 9, 10, 12), count: 3 },
        { startMs: Date.UTC(2026, 9, 10, 12) - 2 * HOUR, count: 2 },
      ],
    });
  });
});
