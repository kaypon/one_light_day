import { MILESTONE_MS } from "./constants";

export type Countdown = {
  phase: "before" | "after";
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

/**
 * Time left until the milestone, or time since it. Before: partial seconds
 * round up, so the display never reads zero early. After: whole seconds elapsed.
 */
export function countdown(nowMs: number): Countdown {
  const before = nowMs < MILESTONE_MS;
  const total = before
    ? Math.ceil((MILESTONE_MS - nowMs) / 1000)
    : Math.floor((nowMs - MILESTONE_MS) / 1000);
  return {
    phase: before ? "before" : "after",
    days: Math.floor(total / 86_400),
    hours: Math.floor(total / 3_600) % 24,
    minutes: Math.floor(total / 60) % 60,
    seconds: total % 60,
  };
}

/** `?now=<ISO>&speed=<n>` lets anyone preview the moment (and lets us QA it). */
export type Override = { nowMs: number | null; speed: number };

const EARLIEST_PREVIEW_MS = Date.UTC(1977, 8, 5);
const LATEST_PREVIEW_MS = Date.UTC(2031, 0, 1);
const MAX_SPEED = 86_400;

export function parseOverride(search: string): Override {
  const params = new URLSearchParams(search);
  const now = Date.parse(params.get("now") ?? "");
  const speed = Number(params.get("speed"));
  return {
    nowMs: now >= EARLIEST_PREVIEW_MS && now <= LATEST_PREVIEW_MS ? now : null,
    speed: params.has("speed") && speed >= 0 && speed <= MAX_SPEED ? speed : 1,
  };
}

/** Maps real time to the time the page shows, starting from `realStartMs`. */
export function createClock(override: Override, realStartMs: number): (realNowMs: number) => number {
  const anchor = override.nowMs ?? realStartMs;
  return (realNowMs) => anchor + (realNowMs - realStartMs) * override.speed;
}
