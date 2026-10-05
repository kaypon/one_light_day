import { AU_KM, KM_PER_MILE } from "./constants";

const pad = (n: number, width: number) => String(n).padStart(width, "0");

/** Integer microseconds, so a reading can never round up to ":60". */
function splitSeconds(sec: number) {
  const micro = Math.round(sec * 1e6);
  return {
    hours: Math.floor(micro / 3_600_000_000),
    minutes: Math.floor(micro / 60_000_000) % 60,
    seconds: Math.floor(micro / 1_000_000) % 60,
    micro: pad(micro % 1_000_000, 6),
  };
}

/** 86392.417381 → "23h 59m 52.417381s" */
export function formatLightTime(sec: number): string {
  const t = splitSeconds(sec);
  return `${t.hours}h ${pad(t.minutes, 2)}m ${pad(t.seconds, 2)}.${t.micro}s`;
}

/** 85978.215489 → { clock: "23:52:58", micro: "215489" }. Hours keep counting past 24. */
export function lightTimeParts(sec: number): { clock: string; micro: string } {
  const t = splitSeconds(sec);
  return { clock: `${pad(t.hours, 2)}:${pad(t.minutes, 2)}:${pad(t.seconds, 2)}`, micro: t.micro };
}

const numberFormats = new Map<number, Intl.NumberFormat>();

export function formatNumber(n: number, decimals: number): string {
  let format = numberFormats.get(decimals);
  if (!format) {
    format = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    numberFormats.set(decimals, format);
  }
  return format.format(n);
}

export type DistanceUnit = "km" | "mi" | "au";

export function formatDistance(km: number, unit: DistanceUnit): string {
  if (unit === "mi") return `${formatNumber(km / KM_PER_MILE, 1)} mi`;
  if (unit === "au") return `${formatNumber(km / AU_KM, 8)} AU`;
  return `${formatNumber(km, 1)} km`;
}

/** 85,265,000 ms → "23h 41m". The two largest non-trivial units, floored. */
export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86_400);
  const h = Math.floor(s / 3_600) % 24;
  const m = Math.floor(s / 60) % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

/** 172,791,400 ms → "47h 59m 51s". Hours never roll into days. */
export function formatHMS(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 3600)}h ${pad(Math.floor(s / 60) % 60, 2)}m ${pad(s % 60, 2)}s`;
}

/** "Wed, Nov 18, 5:16:07 AM" in the given zone (default: the visitor's). */
export function shortMoment(ms: number, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone,
  }).format(ms);
}

/** "Wed, Nov 18, 2026, 5:16:07 AM EST" in the given zone (default: the visitor's). */
export function momentLabel(ms: number, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
    timeZone,
  }).format(ms);
}
