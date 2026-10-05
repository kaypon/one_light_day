import { describe, expect, it } from "vitest";
import { MILESTONE_MS } from "@/lib/constants";
import { formatDistance, formatLightTime, formatNumber, lightTimeParts, momentLabel } from "@/lib/format";

describe("lightTimeParts", () => {
  it("splits seconds into a 24-hour clock reading plus microseconds", () => {
    expect(lightTimeParts(85_978.2154891)).toEqual({ clock: "23:52:58", micro: "215489" });
  });

  it("keeps counting past 24 hours instead of wrapping", () => {
    expect(lightTimeParts(86_437.5)).toEqual({ clock: "24:00:37", micro: "500000" });
  });
});

describe("formatDistance", () => {
  const km = 25_775_637_140.12;

  it("shows kilometers to a tenth", () => {
    expect(formatDistance(km, "km")).toBe("25,775,637,140.1 km");
  });

  it("converts to miles", () => {
    expect(formatDistance(km, "mi")).toBe("16,016,238,380.4 mi");
  });

  it("converts to astronomical units with enough decimals to visibly move", () => {
    expect(formatDistance(km, "au")).toBe("172.29949210 AU");
  });
});

describe("formatLightTime", () => {
  it("shows hours, minutes and seconds down to the microsecond", () => {
    expect(formatLightTime(86_392.4173814)).toBe("23h 59m 52.417381s");
  });

  it("zero-pads minutes and seconds", () => {
    expect(formatLightTime(86_400)).toBe("24h 00m 00.000000s");
    expect(formatLightTime(3_605.5)).toBe("1h 00m 05.500000s");
  });
});

describe("formatNumber", () => {
  it("groups thousands and fixes the decimals", () => {
    expect(formatNumber(25_775_637_140.123, 1)).toBe("25,775,637,140.1");
    expect(formatNumber(126_431_231.6, 0)).toBe("126,431,232");
  });
});

describe("momentLabel", () => {
  it("renders the milestone in a given time zone", () => {
    expect(momentLabel(MILESTONE_MS, "America/New_York")).toMatch(/^Wed, Nov 18, 2026, 5:16:07\sAM EST$/);
    expect(momentLabel(MILESTONE_MS, "America/Los_Angeles")).toMatch(/2:16:07\sAM PST$/);
  });
});
