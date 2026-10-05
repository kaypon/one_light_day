import { describe, expect, it } from "vitest";
import { MILESTONE_MS } from "@/lib/constants";
import { countdown, createClock, parseOverride } from "@/lib/clock";

const SEC = 1_000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("countdown", () => {
  it("splits the time left into days, hours, minutes, seconds", () => {
    const now = MILESTONE_MS - (44 * DAY + 7 * HOUR + 12 * MIN + 9 * SEC);
    expect(countdown(now)).toEqual({ phase: "before", days: 44, hours: 7, minutes: 12, seconds: 9 });
  });

  it("rounds a partial second up, so it never shows zero before the moment", () => {
    expect(countdown(MILESTONE_MS - 1).seconds).toBe(1);
    expect(countdown(MILESTONE_MS - 1500).seconds).toBe(2);
  });

  it("flips to counting up at exactly the milestone", () => {
    expect(countdown(MILESTONE_MS)).toEqual({ phase: "after", days: 0, hours: 0, minutes: 0, seconds: 0 });
  });

  it("counts whole seconds elapsed after the milestone", () => {
    const now = MILESTONE_MS + 3 * DAY + 4 * HOUR + 5 * MIN + 6.9 * SEC;
    expect(countdown(now)).toEqual({ phase: "after", days: 3, hours: 4, minutes: 5, seconds: 6 });
  });
});

describe("parseOverride", () => {
  it("reads a preview time and speed from the query string", () => {
    expect(parseOverride("?now=2026-11-18T10:15:50Z&speed=60")).toEqual({
      nowMs: Date.UTC(2026, 10, 18, 10, 15, 50),
      speed: 60,
    });
  });

  it("ignores values that don't parse or are out of range", () => {
    expect(parseOverride("?now=garbage&speed=-5")).toEqual({ nowMs: null, speed: 1 });
    expect(parseOverride("?now=1066-10-14T00:00:00Z&speed=1e9")).toEqual({ nowMs: null, speed: 1 });
    expect(parseOverride("")).toEqual({ nowMs: null, speed: 1 });
  });
});

describe("createClock", () => {
  it("follows real time when there is no override", () => {
    const clock = createClock({ nowMs: null, speed: 1 }, 1_000);
    expect(clock(5_000)).toBe(5_000);
  });

  it("starts at the override time and runs at the override speed", () => {
    const clock = createClock({ nowMs: MILESTONE_MS - 10 * SEC, speed: 60 }, 1_000);
    expect(clock(1_000)).toBe(MILESTONE_MS - 10 * SEC);
    expect(clock(2_000)).toBe(MILESTONE_MS + 50 * SEC);
  });
});
