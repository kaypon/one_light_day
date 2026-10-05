import { describe, expect, it } from "vitest";
import { MILESTONE_MS } from "@/lib/constants";
import { buildIcs } from "@/lib/ics";

const event = {
  uid: "voyager1-one-light-day@one-light-day",
  startMs: MILESTONE_MS,
  durationMin: 15,
  title: "Voyager 1 reaches one light-day from Earth",
  description: "Light, radio, a command; anything you send takes a full day to arrive.",
  url: "https://one-light-day.vercel.app",
  stampMs: Date.UTC(2026, 9, 5, 12, 0, 0),
};

describe("buildIcs", () => {
  const ics = buildIcs(event);
  const lines = ics.split("\r\n");

  it("uses CRLF line endings and wraps one VEVENT in a VCALENDAR", () => {
    expect(ics).not.toMatch(/[^\r]\n/);
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines).toContain("BEGIN:VEVENT");
    expect(lines.at(-2)).toBe("END:VCALENDAR");
  });

  it("writes UTC start, end and stamp times", () => {
    expect(lines).toContain("DTSTART:20261118T101607Z");
    expect(lines).toContain("DTEND:20261118T103107Z");
    expect(lines).toContain("DTSTAMP:20261005T120000Z");
  });

  it("escapes commas and semicolons in text fields", () => {
    expect(ics).toContain("DESCRIPTION:Light\\, radio\\, a command\\; anything");
  });

  it("folds lines longer than 75 octets", () => {
    for (const line of lines) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(lines.some((l) => l.startsWith(" "))).toBe(true);
  });
});
