import { C_KM_S, LIGHT_DAY_KM, SECONDS_PER_DAY } from "./constants";

/** Where the daily data is served from (public/data, written by scripts/fetch-ephemeris.mts). */
export const EPHEMERIS_URL = "/data/voyager1-daily.json";

/** Shape of that file. */
export type EphemerisFile = {
  startMs: number;
  stepMs: number;
  geo: { rangeKm: number[]; rateKmS: number[] };
  helio: { rangeKm: number[]; rateKmS: number[] };
};

export type Series = {
  startMs: number;
  stepMs: number;
  rangeKm: readonly number[];
  rateKmS: readonly number[];
};

export type Sample = { rangeKm: number; rateKmS: number };

/** geo = distance from Earth's center, helio = from the Sun's center. */
export function seriesFrom(file: EphemerisFile, frame: "geo" | "helio"): Series {
  return { startMs: file.startMs, stepMs: file.stepMs, ...file[frame] };
}

export function lightTimeSec(rangeKm: number): number {
  return rangeKm / C_KM_S;
}

/**
 * Distance and range rate at any instant inside the data, by cubic Hermite
 * interpolation between daily samples, using the range rate as the slope.
 * Good to tens of meters; plain linear interpolation would be off by
 * thousands of km because Earth's orbit bends the curve. Null outside coverage.
 */
export function sample(series: Series, tMs: number): Sample | null {
  const { startMs, stepMs, rangeKm, rateKmS } = series;
  const x = (tMs - startMs) / stepMs;
  const last = rangeKm.length - 1;
  if (!(x >= 0 && x <= last)) return null;

  const i = Math.min(Math.floor(x), last - 1);
  const s = x - i;
  const s2 = s * s;
  const s3 = s2 * s;
  const stepSec = stepMs / 1000;
  const p0 = rangeKm[i];
  const p1 = rangeKm[i + 1];
  const m0 = rateKmS[i] * stepSec;
  const m1 = rateKmS[i + 1] * stepSec;

  return {
    rangeKm: p0 + (p1 - p0) * (3 * s2 - 2 * s3) + m0 * (s3 - 2 * s2 + s) + m1 * (s3 - s2),
    rateKmS:
      ((p1 - p0) * (6 * s - 6 * s2) + m0 * (3 * s2 - 4 * s + 1) + m1 * (3 * s2 - 2 * s)) / stepSec,
  };
}

/**
 * Three honest answers to "when is it one light-day away?"
 * - uplinkSent: after this, a signal sent from Earth takes more than a day to reach Voyager
 *   (it keeps flying away while the signal chases it).
 * - geometric: Earth and Voyager exactly one light-day apart at the same instant (NASA's time).
 * - downlinkReceived: after this, light reaching Earth left Voyager more than a day earlier.
 * Voyager moves ~17 km/s × 86,400 s ≈ 1.46M km during the trip, which shifts each answer ~16 hours.
 */
export function lightDayMoments(geo: Series, helio: Series) {
  const geometric = findCrossing(geo, LIGHT_DAY_KM);
  if (geometric === null) return null;
  const drift = sample(helio, geometric)!.rateKmS * SECONDS_PER_DAY;
  const uplinkSent = findCrossing(geo, LIGHT_DAY_KM - drift);
  const downlinkReceived = findCrossing(geo, LIGHT_DAY_KM + drift);
  if (uplinkSent === null || downlinkReceived === null) return null;
  return { uplinkSent, geometric, downlinkReceived };
}

/** First instant the range climbs through `targetKm`, to the millisecond. Null if it never does. */
export function findCrossing(series: Series, targetKm: number): number | null {
  const { startMs, stepMs, rangeKm } = series;
  for (let i = 0; i < rangeKm.length - 1; i++) {
    if (!(rangeKm[i] < targetKm && rangeKm[i + 1] >= targetKm)) continue;
    let lo = startMs + i * stepMs;
    let hi = lo + stepMs;
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (sample(series, mid)!.rangeKm < targetKm) lo = mid;
      else hi = mid;
    }
    return hi;
  }
  return null;
}
