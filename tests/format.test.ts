import { describe, expect, it } from "vitest";
import { MILESTONE_MS } from "@/lib/constants";
import { formatLightTime, formatNumber, momentLabel } from "@/lib/format";

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
