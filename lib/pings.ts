import { C_KM_S } from "./constants";
import { sample, type Series } from "./ephemeris";
import { MILESTONES, type Milestone } from "./milestones";

export type Ping = { id: string; sentAt: number; note?: string };
export type Timeline = { sentAt: number; arrivesAt: number; homeAt: number };
export type Position = { phase: "outbound" | "reply" | "home"; km: number };

export const MAX_STORED_PINGS = 20;
export const MAX_NOTE_LENGTH = 80;
const HOUR_MS = 3_600_000;

export function hourStart(ms: number): number {
  return Math.floor(ms / HOUR_MS) * HOUR_MS;
}

/**
 * When a ping sent at `sentAt` reaches Voyager, and when its reply would get
 * home. Out: Voyager keeps flying away while the ping chases it, so
 * τ = ρ / (c − v). Back: the reply has less to cover than the distance at
 * arrival, τ = ρ(home) / (c + v), solved by a few rounds of iteration.
 */
export function pingTimeline(sentAt: number, eph: { geo: Series; helio: Series }): Timeline | null {
  const out = sample(eph.geo, sentAt);
  const away = sample(eph.helio, sentAt);
  if (!out || !away) return null;
  const upSec = out.rangeKm / (C_KM_S - away.rateKmS);
  const arrivesAt = sentAt + upSec * 1000;

  const v = sample(eph.helio, arrivesAt);
  if (!v) return null;
  let downSec = upSec;
  for (let i = 0; i < 3; i++) {
    const home = sample(eph.geo, arrivesAt + downSec * 1000);
    if (!home) return null;
    downSec = home.rangeKm / (C_KM_S + v.rateKmS);
  }
  return { sentAt, arrivesAt, homeAt: arrivesAt + downSec * 1000 };
}

/** Distance from Earth: outbound grows at c, the reply shrinks at c. */
export function pingPosition(t: Timeline, nowMs: number): Position {
  if (nowMs < t.arrivesAt) return { phase: "outbound", km: C_KM_S * (Math.max(0, nowMs - t.sentAt) / 1000) };
  if (nowMs < t.homeAt) return { phase: "reply", km: C_KM_S * ((t.homeAt - nowMs) / 1000) };
  return { phase: "home", km: 0 };
}

export function lastMilestonePassed(km: number): Milestone | null {
  let passed: Milestone | null = null;
  for (const m of MILESTONES) if (m.km <= km) passed = m;
  return passed;
}

/** Tiny seeded PRNG so everyone's dots land in the same spots on every render. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/**
 * Turns hourly ping counts into approximate departure times. The server only
 * keeps counts per hour (no individual pings), so each dot gets a stable
 * pseudo-random moment inside its hour, never later than now.
 */
export function dotsFromHours(
  hours: { startMs: number; count: number }[],
  nowMs: number,
  maxPerHour: number,
): number[] {
  const out: number[] = [];
  for (const { startMs, count } of hours) {
    const span = Math.min(HOUR_MS, nowMs - startMs);
    if (span <= 0) continue;
    const rand = mulberry32(startMs / HOUR_MS);
    for (let i = 0; i < Math.min(count, maxPerHour); i++) out.push(startMs + rand() * span);
  }
  return out;
}

const EARLIEST_MS = Date.UTC(2026, 0, 1);
const LATEST_MS = Date.UTC(2031, 0, 1);

/** Reads pings back from localStorage, tolerating anything that's been tampered with. */
export function parseStoredPings(raw: string | null): Ping[] {
  let data: unknown;
  try {
    data = JSON.parse(raw ?? "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const pings: Ping[] = [];
  for (const item of data) {
    if (pings.length === MAX_STORED_PINGS) break;
    if (typeof item !== "object" || item === null) continue;
    const { id, sentAt, note } = item as Record<string, unknown>;
    if (typeof id !== "string" || id.length > 64) continue;
    if (typeof sentAt !== "number" || !(sentAt >= EARLIEST_MS && sentAt < LATEST_MS)) continue;
    const ping: Ping = { id, sentAt };
    if (typeof note === "string" && note.trim()) ping.note = note.trim().slice(0, MAX_NOTE_LENGTH);
    pings.push(ping);
  }
  return pings;
}
