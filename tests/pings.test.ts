import { describe, expect, it } from "vitest";
import daily from "@/public/data/voyager1-daily.json";
import { C_KM_S } from "@/lib/constants";
import { seriesFrom } from "@/lib/ephemeris";
import {
  MAX_STORED_PINGS,
  dotsFromHours,
  lastMilestonePassed,
  parseStoredPings,
  pingPosition,
  pingTimeline,
} from "@/lib/pings";

const eph = { geo: seriesFrom(daily, "geo"), helio: seriesFrom(daily, "helio") };
const HOUR = 3_600_000;

describe("pingTimeline", () => {
  it("matches Horizons: a ping sent Nov 17 18:24:45 UTC takes exactly a day to reach Voyager", () => {
    const sentAt = Date.UTC(2026, 10, 17, 18, 24, 45);
    const t = pingTimeline(sentAt, eph)!;
    expect(Math.abs((t.arrivesAt - sentAt) / 1000 - 86_400)).toBeLessThan(1);
  });

  it("matches Horizons: light leaving Voyager Nov 18 02:17:27 UTC takes exactly a day to get home", () => {
    // Pick the send time whose reply leaves Voyager at that moment.
    const leaves = Date.UTC(2026, 10, 18, 2, 17, 27);
    const t = pingTimeline(leaves - 86_395_000, eph)!;
    const replySec = (t.homeAt - t.arrivesAt) / 1000;
    expect(Math.abs(t.arrivesAt - leaves)).toBeLessThan(60_000);
    expect(Math.abs(replySec - 86_400)).toBeLessThan(1);
  });

  it("returns null outside the data's coverage", () => {
    expect(pingTimeline(Date.UTC(2031, 0, 1), eph)).toBeNull();
  });
});

describe("pingPosition", () => {
  const sentAt = Date.UTC(2026, 9, 10, 12);
  const timeline = { sentAt, arrivesAt: sentAt + 86_000_000, homeAt: sentAt + 172_000_000 };

  it("flies outbound at the speed of light", () => {
    expect(pingPosition(timeline, sentAt + 10_000)).toEqual({ phase: "outbound", km: C_KM_S * 10 });
  });

  it("comes back as a reply once it reaches Voyager", () => {
    const p = pingPosition(timeline, timeline.homeAt - 2_000);
    expect(p.phase).toBe("reply");
    expect(p.km).toBeCloseTo(C_KM_S * 2, 6);
  });

  it("is home after the round trip", () => {
    expect(pingPosition(timeline, timeline.homeAt + 1).phase).toBe("home");
  });
});

describe("lastMilestonePassed", () => {
  it("names the last landmark the light has gone past", () => {
    expect(lastMilestonePassed(100)).toBeNull();
    expect(lastMilestonePassed(400_000)?.label).toBe("the Moon");
    expect(lastMilestonePassed(2e8)?.label).toBe("the Sun");
    expect(lastMilestonePassed(1.9e10)?.label).toBe("the heliopause");
  });
});

describe("dotsFromHours", () => {
  const nowMs = Date.UTC(2026, 9, 10, 12, 30);
  const hours = [
    { startMs: Date.UTC(2026, 9, 10, 12), count: 3 },
    { startMs: Date.UTC(2026, 9, 10, 11), count: 2 },
  ];

  it("spreads each hour's pings across that hour, never in the future", () => {
    const dots = dotsFromHours(hours, nowMs, 100);
    expect(dots).toHaveLength(5);
    for (const t of dots) expect(t).toBeLessThanOrEqual(nowMs);
    expect(dots.filter((t) => t >= Date.UTC(2026, 9, 10, 12))).toHaveLength(3);
  });

  it("is deterministic and caps the count per hour", () => {
    expect(dotsFromHours(hours, nowMs, 100)).toEqual(dotsFromHours(hours, nowMs, 100));
    expect(dotsFromHours([{ startMs: Date.UTC(2026, 9, 10, 11), count: 999 }], nowMs, 40)).toHaveLength(40);
  });
});

describe("parseStoredPings", () => {
  it("survives missing or corrupt storage", () => {
    expect(parseStoredPings(null)).toEqual([]);
    expect(parseStoredPings("{not json")).toEqual([]);
    expect(parseStoredPings(JSON.stringify({ nope: 1 }))).toEqual([]);
  });

  it("keeps valid pings, drops broken ones, trims notes, caps the list", () => {
    const valid = { id: "a", sentAt: 1_790_000_000_000, note: "hi from Miami" };
    const raw = JSON.stringify([valid, { id: 3 }, { id: "b", sentAt: "soon" }, { id: "c", sentAt: 1_790_000_000_001, note: "x".repeat(500) }]);
    const parsed = parseStoredPings(raw);
    expect(parsed[0]).toEqual(valid);
    expect(parsed).toHaveLength(2);
    expect(parsed[1].note!.length).toBeLessThanOrEqual(80);

    const many = JSON.stringify(Array.from({ length: 50 }, (_, i) => ({ id: `p${i}`, sentAt: 1_790_000_000_000 + i })));
    expect(parseStoredPings(many)).toHaveLength(MAX_STORED_PINGS);
  });
});

describe("hour bucketing", () => {
  it("rounds a time down to its UTC hour", async () => {
    const { hourStart } = await import("@/lib/pings");
    expect(hourStart(Date.UTC(2026, 9, 10, 12, 59, 59))).toBe(Date.UTC(2026, 9, 10, 12));
    expect(hourStart(Date.UTC(2026, 9, 10, 12)) - hourStart(Date.UTC(2026, 9, 10, 11, 1))).toBe(HOUR);
  });
});
