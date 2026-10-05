import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseConfig, parseDsn, summarizeDsn } from "@/lib/dsn";

const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf8");
const live = fixture("dsn-live.xml");
const withVoyager = fixture("dsn-vgr1.xml");
const config = parseConfig(fixture("dsn-config.xml"));

describe("parseDsn", () => {
  it("reads the three complexes and the dishes listed under each", () => {
    const snap = parseDsn(live);
    expect(snap.stations.map((s) => s.friendlyName)).toEqual(["Goldstone", "Madrid", "Canberra"]);
    expect(snap.stations.reduce((n, s) => n + s.dishes.length, 0)).toBe(13);
  });

  it("keeps signals and targets on the dish they belong to", () => {
    const dss26 = parseDsn(live).stations[0].dishes.find((d) => d.name === "DSS26")!;
    expect(dss26.targets.map((t) => t.code)).toEqual(["EMM", "MRO"]);
    expect(dss26.signals).toContainEqual({ direction: "down", active: true, dataRateBps: 1_500_000, band: "X", code: "MRO" });
  });

  it("decodes entities and treats -1 as unknown", () => {
    const dss63 = parseDsn(withVoyager).stations[1].dishes.find((d) => d.name === "DSS63")!;
    expect(dss63.activity).toBe("Spacecraft Telemetry & Tracking");
    const dss14 = parseDsn(live).stations[0].dishes.find((d) => d.name === "DSS14")!;
    expect(dss14.targets[0].rtltSec).toBeNull();
  });

  it("returns nothing (instead of throwing) for junk", () => {
    expect(parseDsn("").stations).toEqual([]);
    expect(parseDsn("<html>not the feed</html>").stations).toEqual([]);
  });
});

describe("parseConfig", () => {
  it("maps spacecraft codes to names and dishes to sizes", () => {
    expect(config.spacecraft.get("VGR1")).toBe("Voyager 1");
    expect(config.spacecraft.get("MSL")).toBe("Mars Science Laboratory (Curiosity)");
    expect(config.dishes.get("DSS63")).toEqual({ label: "DSS 63", size: "70 m" });
    expect(config.dishes.get("DSS26")).toEqual({ label: "DSS 26", size: "34 m" });
  });
});

describe("summarizeDsn", () => {
  it("lists who each complex is talking to, skipping maintenance", () => {
    const summary = summarizeDsn(parseDsn(live), config);
    const goldstone = summary.stations[0];
    expect(goldstone.name).toBe("Goldstone");
    expect(goldstone.links.map((l) => l.name)).toContain("Mars Reconnaissance Orbiter");
    expect(summary.stations.flatMap((s) => s.links).some((l) => l.code === "DSN" || l.code === "DSS")).toBe(false);
    expect(summary.voyager1).toBeNull();
  });

  it("pulls out Voyager 1 when a dish is on it", () => {
    const summary = summarizeDsn(parseDsn(withVoyager), config);
    expect(summary.voyager1).toEqual({
      code: "VGR1",
      name: "Voyager 1",
      station: "Madrid",
      dish: "DSS 63",
      size: "70 m",
      downBps: 160,
      receiving: true,
      rtltSec: 171_980.5,
      rangeKm: 2.578e10,
    });
  });

  it("carries a known range so far-off neighbors can be compared", () => {
    const msl = summarizeDsn(parseDsn(live), config)
      .stations.flatMap((s) => s.links)
      .find((l) => l.code === "MSL")!;
    expect(msl.rangeKm).toBe(244_000_000);
  });
});
