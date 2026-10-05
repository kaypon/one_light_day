// Pulls Voyager 1's trajectory from JPL Horizons and writes the static data
// files the site runs on. Run by hand (`npm run ephemeris`) and commit the
// output — the deployed site never talks to Horizons.
//
// Distances are geometric (VEC_CORR=NONE): Earth and Voyager at the same
// instant, no light-time correction. That's the definition behind NASA's
// "one light-day at 2:16:07 a.m. PST, Nov 18, 2026".

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://ssd.jpl.nasa.gov/api/horizons.api";
const JD_UNIX_EPOCH = 2440587.5;
const MS_PER_DAY = 86_400_000;

type Row = { ms: number; rangeKm: number; rateKmS: number };

const CENTERS = {
  geo: "500@399", // Earth's center
  helio: "500@10", // Sun's center
} as const;

async function vectors(center: string, start: string, stop: string, step: string): Promise<Row[]> {
  const params = new URLSearchParams({
    format: "text",
    COMMAND: "'-31'",
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'VECTORS'",
    CENTER: `'${center}'`,
    START_TIME: `'${start}'`,
    STOP_TIME: `'${stop}'`,
    STEP_SIZE: `'${step}'`,
    VEC_TABLE: "'4'", // position + light-time, range, range-rate
    VEC_CORR: "'NONE'",
    OUT_UNITS: "'KM-S'",
    TIME_TYPE: "'UT'",
    CSV_FORMAT: "'YES'",
  });

  let text = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(`${API}?${params}`);
    text = await res.text();
    if (res.ok && text.includes("$$SOE")) break;
    if (attempt === 3) throw new Error(`Horizons failed (${res.status}): ${text.slice(0, 400)}`);
    await new Promise((r) => setTimeout(r, 2000 * attempt));
  }

  const body = text.slice(text.indexOf("$$SOE") + 5, text.indexOf("$$EOE"));
  return body
    .trim()
    .split("\n")
    .map((line) => {
      // JDUT, Calendar, X, Y, Z, LT, RG, RR,
      const cols = line.split(",").map((c) => c.trim());
      return {
        ms: Math.round((Number(cols[0]) - JD_UNIX_EPOCH) * MS_PER_DAY),
        rangeKm: Number(cols[6]),
        rateKmS: Number(cols[7]),
      };
    });
}

function assertDaily(rows: Row[], label: string) {
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].ms - rows[i - 1].ms !== MS_PER_DAY) {
      throw new Error(`${label}: non-daily step at row ${i}`);
    }
  }
  if (rows.some((r) => !Number.isFinite(r.rangeKm) || !Number.isFinite(r.rateKmS))) {
    throw new Error(`${label}: unparseable values`);
  }
}

const round = (n: number, places: number) => Number(n.toFixed(places));

async function writeJson(relPath: string, data: unknown) {
  const path = join(ROOT, relPath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data) + "\n");
  console.log(`wrote ${relPath}`);
}

/** Timeline chapters: exact distances at these moments (UT). Copy lives in the timeline component. */
const EVENTS: { id: string; at: string }[] = [
  { id: "launch", at: "1977-09-06T00:00:00Z" }, // first moment Horizons has; launch was 12:56 UT the day before
  { id: "overtakes", at: "1977-12-15T00:00:00Z" },
  { id: "jupiter", at: "1979-03-05T12:05:00Z" },
  { id: "saturn", at: "1980-11-12T23:46:00Z" },
  { id: "pale-blue-dot", at: "1990-02-14T04:48:00Z" },
  { id: "farthest", at: "1998-02-17T00:00:00Z" },
  { id: "termination-shock", at: "2004-12-16T00:00:00Z" },
  { id: "heliopause", at: "2012-08-25T00:00:00Z" },
  { id: "thrusters", at: "2017-11-28T00:00:00Z" },
  { id: "glitch", at: "2023-11-14T00:00:00Z" },
  { id: "fixed", at: "2024-04-20T00:00:00Z" },
  { id: "light-day", at: "2026-11-18T10:16:07Z" },
  { id: "voyager-2", at: "2035-11-15T00:00:00Z" },
];

async function eventVectors(center: string): Promise<Row[]> {
  const jds = EVENTS.map((e) => (Date.parse(e.at) / MS_PER_DAY + JD_UNIX_EPOCH).toFixed(9));
  const params = new URLSearchParams({
    format: "text",
    COMMAND: "'-31'",
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'VECTORS'",
    CENTER: `'${center}'`,
    TLIST: jds.map((jd) => `'${jd}'`).join(" "),
    TLIST_TYPE: "'JD'",
    VEC_TABLE: "'4'",
    VEC_CORR: "'NONE'",
    OUT_UNITS: "'KM-S'",
    TIME_TYPE: "'UT'",
    CSV_FORMAT: "'YES'",
  });
  const res = await fetch(`${API}?${params}`);
  const text = await res.text();
  if (!text.includes("$$SOE")) throw new Error(`Horizons events failed: ${text.slice(0, 400)}`);
  const body = text.slice(text.indexOf("$$SOE") + 5, text.indexOf("$$EOE"));
  return body
    .trim()
    .split("\n")
    .map((line) => {
      const cols = line.split(",").map((c) => c.trim());
      return {
        ms: Math.round((Number(cols[0]) - JD_UNIX_EPOCH) * MS_PER_DAY),
        rangeKm: Number(cols[6]),
        rateKmS: Number(cols[7]),
      };
    });
}

async function writeEvents(source: string) {
  const [geo, helio] = await Promise.all([eventVectors(CENTERS.geo), eventVectors(CENTERS.helio)]);
  if (geo.length !== EVENTS.length || helio.length !== EVENTS.length) {
    throw new Error(`expected ${EVENTS.length} event rows, got ${geo.length}/${helio.length}`);
  }
  await writeJson("data/events.json", {
    source,
    events: EVENTS.map((e, i) => ({
      id: e.id,
      ms: Date.parse(e.at),
      geoKm: Math.round(geo[i].rangeKm),
      helioKm: Math.round(helio[i].rangeKm),
    })),
  });
}

async function main() {
  const source = "JPL Horizons, target -31 (Voyager 1), geometric vectors (VEC_CORR=NONE), UT";
  if (process.argv.includes("--events-only")) return writeEvents(source);
  await writeEvents(source);

  // Daily series for the live readouts: 2026 through 2030.
  const [geo, helio] = await Promise.all([
    vectors(CENTERS.geo, "2026-01-01", "2031-01-01", "1d"),
    vectors(CENTERS.helio, "2026-01-01", "2031-01-01", "1d"),
  ]);
  assertDaily(geo, "geo");
  assertDaily(helio, "helio");
  if (geo.length !== helio.length || geo[0].ms !== helio[0].ms) {
    throw new Error("geo/helio series don't line up");
  }

  await writeJson("public/data/voyager1-daily.json", {
    source,
    generatedAt: new Date().toISOString(),
    startMs: geo[0].ms,
    stepMs: MS_PER_DAY,
    geo: {
      rangeKm: geo.map((r) => round(r.rangeKm, 2)),
      rateKmS: geo.map((r) => round(r.rateKmS, 7)),
    },
    helio: {
      rangeKm: helio.map((r) => round(r.rangeKm, 2)),
      rateKmS: helio.map((r) => round(r.rateKmS, 7)),
    },
  });

  // Monthly series from launch, for the long view (signal delay over 49 years).
  const monthly = await vectors(CENTERS.geo, "1977-09-06", "2031-01-01", "1 mo");
  await writeJson("data/voyager1-monthly.json", {
    source,
    ms: monthly.map((r) => r.ms),
    rangeKm: monthly.map((r) => Math.round(r.rangeKm)),
  });

  // Held-out 6-hourly samples the tests check the interpolation against:
  // the light-day crossing window and the spring-dip window.
  const [nov, mar] = await Promise.all([
    vectors(CENTERS.geo, "2026-11-01", "2026-11-30", "6h"),
    vectors(CENTERS.geo, "2027-03-01", "2027-03-15", "6h"),
  ]);
  await writeJson("tests/fixtures/horizons-geo-6h.json", { source, rows: [...nov, ...mar] });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
