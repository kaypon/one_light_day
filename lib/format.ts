const pad = (n: number, width: number) => String(n).padStart(width, "0");

/** 86392.417381 → "23h 59m 52.417381s". Integer microseconds, so it can't print "60.000000s". */
export function formatLightTime(sec: number): string {
  const micro = Math.round(sec * 1e6);
  const hours = Math.floor(micro / 3_600_000_000);
  const minutes = Math.floor(micro / 60_000_000) % 60;
  const seconds = Math.floor(micro / 1_000_000) % 60;
  return `${hours}h ${pad(minutes, 2)}m ${pad(seconds, 2)}.${pad(micro % 1_000_000, 6)}s`;
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
