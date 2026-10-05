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
