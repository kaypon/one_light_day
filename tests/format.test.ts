import { describe, expect, it } from "vitest";
import { MILESTONE_MS } from "@/lib/constants";
import {
  formatDataRate,
  formatDistance,
  formatDuration,
  formatHMS,
  formatLightDistance,
  formatLightTime,
  formatNumber,
  lightTimeParts,
  momentLabel,
  shortMoment,
} from "@/lib/format";

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

describe("formatDuration", () => {
  it("shows the two most useful units", () => {
    expect(formatDuration(45_000)).toBe("45s");
    expect(formatDuration(8 * 60_000 + 19_000)).toBe("8m 19s");
    expect(formatDuration(23 * 3_600_000 + 41 * 60_000 + 5_000)).toBe("23h 41m");
    expect(formatDuration(47 * 3_600_000 + 59 * 60_000)).toBe("1d 23h");
  });

  it("never goes negative", () => {
    expect(formatDuration(-5_000)).toBe("0s");
  });
});

describe("formatHMS", () => {
  it("shows whole hours, minutes and seconds without rolling hours into days", () => {
    expect(formatHMS((47 * 3600 + 59 * 60 + 51) * 1000 + 400)).toBe("47h 59m 51s");
    expect(formatHMS(65_000)).toBe("0h 01m 05s");
  });
});

describe("formatDataRate", () => {
  it("picks bits, kilobits or megabits per second", () => {
    expect(formatDataRate(160)).toBe("160 bits/s");
    expect(formatDataRate(28_440)).toBe("28.4 kbit/s");
    expect(formatDataRate(1_500_000)).toBe("1.5 Mbit/s");
  });
});

describe("formatLightDistance", () => {
  it("says how long light takes to cover a distance, in the unit that reads best", () => {
    expect(formatLightDistance(384_400)).toBe("1.3 light-seconds");
    expect(formatLightDistance(244_000_000)).toBe("13.6 light-minutes");
    expect(formatLightDistance(25_800_000_000)).toBe("23.9 light-hours");
  });
});

describe("shortMoment", () => {
  it("gives weekday, date and time in the given zone", () => {
    expect(shortMoment(MILESTONE_MS, "America/New_York")).toMatch(/^Wed, Nov 18, 5:16:07\sAM$/);
  });
});

describe("momentLabel", () => {
  it("renders the milestone in a given time zone", () => {
    expect(momentLabel(MILESTONE_MS, "America/New_York")).toMatch(/^Wed, Nov 18, 2026, 5:16:07\sAM EST$/);
    expect(momentLabel(MILESTONE_MS, "America/Los_Angeles")).toMatch(/2:16:07\sAM PST$/);
  });
});
