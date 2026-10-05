import { describe, expect, it } from "vitest";
import daily from "@/public/data/voyager1-daily.json";
import { sample, seriesFrom } from "@/lib/ephemeris";
import { earthLongitudeDeg, earthTowardVoyagerKmS } from "@/lib/orbit";

const geo = seriesFrom(daily, "geo");
const helio = seriesFrom(daily, "helio");
const DAY = 86_400_000;

describe("earthLongitudeDeg", () => {
  it("puts Earth opposite the Sun's equinox point at the March equinox", () => {
    // March equinox 2027: Mar 20, 20:25 UTC. Sun at 0°, so Earth at 180°.
    expect(earthLongitudeDeg(Date.UTC(2027, 2, 20, 20, 25))).toBeCloseTo(180, 1);
  });

  it("stays in 0–360", () => {
    for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2028, 0, 1); t += 17 * DAY) {
      const lon = earthLongitudeDeg(t);
      expect(lon).toBeGreaterThanOrEqual(0);
      expect(lon).toBeLessThan(360);
    }
  });
});

describe("earthTowardVoyagerKmS", () => {
  it("matches what JPL's data implies (Voyager's own speed minus the change in distance)", () => {
    for (let t = Date.UTC(2026, 9, 1); t < Date.UTC(2027, 11, 31); t += 7 * DAY) {
      const implied = sample(helio, t)!.rateKmS - sample(geo, t)!.rateKmS;
      expect(Math.abs(earthTowardVoyagerKmS(t) - implied)).toBeLessThan(0.6);
    }
  });

  it("outruns Voyager (so the distance shrinks) from late January to late April", () => {
    const shrinking = (t: number) => earthTowardVoyagerKmS(t) > sample(helio, t)!.rateKmS;
    expect(shrinking(Date.UTC(2027, 0, 14))).toBe(false);
    expect(shrinking(Date.UTC(2027, 0, 28))).toBe(true);
    expect(shrinking(Date.UTC(2027, 3, 17))).toBe(true);
    expect(shrinking(Date.UTC(2027, 4, 1))).toBe(false);
  });
});
