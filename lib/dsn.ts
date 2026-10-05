// Parses NASA's "DSN Now" feed (eyes.nasa.gov/dsn/data/dsn.xml) and its
// config. The feed is flat and attribute-only, so a small tag scanner is
// enough. Everything here is treated as untrusted text: numbers are
// validated, strings are only ever rendered as plain text.

export type DsnSignal = {
  direction: "up" | "down";
  active: boolean;
  dataRateBps: number | null;
  band: string;
  code: string;
};

export type DsnTarget = {
  code: string;
  id: number;
  rtltSec: number | null;
  uplegKm: number | null;
  downlegKm: number | null;
};

export type DsnDish = { name: string; activity: string; signals: DsnSignal[]; targets: DsnTarget[] };
export type DsnStation = { name: string; friendlyName: string; timeUTC: number; dishes: DsnDish[] };
export type DsnSnapshot = { stations: DsnStation[] };

export type DsnConfig = {
  spacecraft: Map<string, string>;
  dishes: Map<string, { label: string; size: string }>;
};

export type DsnLink = {
  code: string;
  name: string;
  station: string;
  dish: string;
  size: string;
  downBps: number | null;
  receiving: boolean;
  rtltSec: number | null;
  rangeKm: number | null;
};

export type DsnSummary = {
  stations: { name: string; links: DsnLink[] }[];
  voyager1: DsnLink | null;
};

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function attributes(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [, key, value] of raw.matchAll(/([A-Za-z][\w:-]*)="([^"]*)"/g)) {
    out[key] = value.replace(/&(amp|lt|gt|quot|apos);/g, (_, e: string) => ENTITIES[e]);
  }
  return out;
}

/** -1 (and anything unparseable) means "unknown" in the feed. */
function measure(value: string | undefined): number | null {
  const n = Number(value);
  return value !== undefined && value !== "" && Number.isFinite(n) && n >= 0 ? n : null;
}

export function parseDsn(xml: string): DsnSnapshot {
  const stations: DsnStation[] = [];
  let dish: DsnDish | null = null;
  for (const [, close, tag, raw] of xml.matchAll(/<(\/?)(station|dish|downSignal|upSignal|target)\b([^>]*)>/g)) {
    const station = stations.at(-1);
    if (close) {
      if (tag === "dish") dish = null;
      continue;
    }
    const a = attributes(raw);
    if (tag === "station") {
      stations.push({ name: a.name ?? "", friendlyName: a.friendlyName ?? a.name ?? "", timeUTC: Number(a.timeUTC) || 0, dishes: [] });
      dish = null;
    } else if (tag === "dish" && station) {
      dish = { name: a.name ?? "", activity: a.activity ?? "", signals: [], targets: [] };
      station.dishes.push(dish);
    } else if ((tag === "downSignal" || tag === "upSignal") && dish) {
      dish.signals.push({
        direction: tag === "downSignal" ? "down" : "up",
        active: a.active === "true",
        dataRateBps: measure(a.dataRate),
        band: a.band ?? "",
        code: a.spacecraft ?? "",
      });
    } else if (tag === "target" && dish) {
      dish.targets.push({
        code: a.name ?? "",
        id: Number(a.id) || 0,
        rtltSec: measure(a.rtlt),
        uplegKm: measure(a.uplegRange),
        downlegKm: measure(a.downlegRange),
      });
    }
  }
  return { stations };
}

export function parseConfig(xml: string): DsnConfig {
  const spacecraft = new Map<string, string>();
  const dishes = new Map<string, { label: string; size: string }>();
  for (const [, raw] of xml.matchAll(/<spacecraft\b([^>]*)>/g)) {
    const a = attributes(raw);
    if (a.name && a.friendlyName) spacecraft.set(a.name.toUpperCase(), a.friendlyName);
  }
  for (const [, raw] of xml.matchAll(/<dish\b([^>]*)>/g)) {
    const a = attributes(raw);
    const meters = a.type?.match(/^(\d+)M/)?.[1];
    if (a.name) dishes.set(a.name, { label: a.friendlyName ?? a.name, size: meters ? `${meters} m` : "" });
  }
  return { spacecraft, dishes };
}

/** Pseudo-targets the feed uses for maintenance and engineering time. */
const isPlaceholder = (t: DsnTarget) => t.id === 99 || t.code === "DSN" || t.code === "DSS";

export function summarizeDsn(snapshot: DsnSnapshot, config: DsnConfig): DsnSummary {
  const stations = snapshot.stations.map((station) => {
    const links: DsnLink[] = [];
    for (const dish of station.dishes) {
      const dishInfo = config.dishes.get(dish.name);
      for (const target of dish.targets) {
        if (isPlaceholder(target)) continue;
        const down = dish.signals.filter((s) => s.direction === "down" && s.code === target.code && s.active);
        const rates = down.map((s) => s.dataRateBps).filter((r): r is number => r !== null && r > 0);
        links.push({
          code: target.code,
          name: config.spacecraft.get(target.code) ?? target.code,
          station: station.friendlyName,
          dish: dishInfo?.label ?? dish.name,
          size: dishInfo?.size ?? "",
          downBps: rates.length ? Math.max(...rates) : null,
          receiving: down.length > 0,
          rtltSec: target.rtltSec,
          rangeKm: target.downlegKm ?? target.uplegKm,
        });
      }
    }
    return { name: station.friendlyName, links };
  });
  const voyagerLinks = stations.flatMap((s) => s.links).filter((l) => l.code === "VGR1");
  return { stations, voyager1: voyagerLinks.find((l) => l.receiving) ?? voyagerLinks[0] ?? null };
}
