import { describe, expect, it } from "vitest";
import daily from "@/public/data/voyager1-daily.json";
import fixture from "./fixtures/horizons-geo-6h.json";
import { LIGHT_DAY_KM, MILESTONE_MS } from "@/lib/constants";
import { findCrossing, lightDayMoments, lightTimeSec, sample, seriesFrom } from "@/lib/ephemeris";

const geo = seriesFrom(daily, "geo");
const HOUR = 3_600_000;

describe("constants", () => {
  it("defines a light-day as c × 86,400 s", () => {
    expect(LIGHT_DAY_KM).toBeCloseTo(25_902_068_371.2, 1);
  });

  it("pins the milestone to NASA's 2:16:07 a.m. PST on Nov 18, 2026", () => {
    expect(new Date(MILESTONE_MS).toISOString()).toBe("2026-11-18T10:16:07.000Z");
  });
});

describe("lightTimeSec", () => {
  it("turns one light-day of distance into exactly 86,400 seconds", () => {
    expect(lightTimeSec(LIGHT_DAY_KM)).toBeCloseTo(86_400, 9);
  });
});

describe("sample (geocentric)", () => {
  it("reproduces held-out 6-hourly Horizons ranges within 1 km", () => {
    for (const row of fixture.rows) {
      const s = sample(geo, row.ms);
      expect(s).not.toBeNull();
      expect(Math.abs(s!.rangeKm - row.rangeKm)).toBeLessThan(1);
    }
  });

  it("reproduces held-out range rates within 1 m/s", () => {
    for (const row of fixture.rows) {
      expect(Math.abs(sample(geo, row.ms)!.rateKmS - row.rateKmS)).toBeLessThan(0.001);
    }
  });

  it("returns null outside the data's coverage", () => {
    expect(sample(geo, Date.UTC(2025, 11, 31))).toBeNull();
    expect(sample(geo, Date.UTC(2031, 0, 2))).toBeNull();
  });
});

describe("findCrossing", () => {
  it("lands on NASA's one-light-day moment within 2 seconds", () => {
    const t = findCrossing(geo, LIGHT_DAY_KM);
    expect(t).not.toBeNull();
    expect(Math.abs(t! - MILESTONE_MS)).toBeLessThan(2_000);
  });

  it("returns null for a distance the data never reaches", () => {
    expect(findCrossing(geo, LIGHT_DAY_KM * 2)).toBeNull();
  });
});

describe("lightDayMoments", () => {
  const helio = seriesFrom(daily, "helio");
  const moments = lightDayMoments(geo, helio)!;
  const MIN = 60_000;

  it("puts the geometric moment on NASA's time", () => {
    expect(Math.abs(moments.geometric - MILESTONE_MS)).toBeLessThan(2_000);
  });

  it("matches Horizons: a command sent after Nov 17 18:24:45 UTC needs over a day", () => {
    expect(Math.abs(moments.uplinkSent - Date.UTC(2026, 10, 17, 18, 24, 45))).toBeLessThan(MIN);
  });

  it("matches Horizons: light received after Nov 19 02:17:27 UTC left over a day earlier", () => {
    expect(Math.abs(moments.downlinkReceived - Date.UTC(2026, 10, 19, 2, 17, 27))).toBeLessThan(MIN);
  });
});

describe("the spring dip (copy fact)", () => {
  it("shrinks about 40.66 million km between late January and late April 2027", () => {
    const hourly = (from: number, to: number) => {
      const out: number[] = [];
      for (let t = from; t <= to; t += HOUR) out.push(sample(geo, t)!.rangeKm);
      return out;
    };
    const peak = Math.max(...hourly(Date.UTC(2027, 0, 10), Date.UTC(2027, 0, 31)));
    const trough = Math.min(...hourly(Date.UTC(2027, 3, 10), Date.UTC(2027, 4, 5)));
    expect((peak - trough) / 1e6).toBeCloseTo(40.66, 1);
    expect(trough).toBeGreaterThan(LIGHT_DAY_KM);
  });
});
