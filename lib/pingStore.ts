import { createHmac } from "node:crypto";
import { PING_COOLDOWN_SEC, hourStart } from "./pings";

/** The two Redis calls the ping counter needs (an @upstash/redis client satisfies this). */
export type PingStore = {
  eval(script: string, keys: string[], args: string[]): Promise<unknown>;
  mget(...keys: string[]): Promise<unknown[]>;
};

/** One ping per address per this many seconds. */
export const THROTTLE_SEC = PING_COOLDOWN_SEC;
/** Stop counting past this many pings a month, so the free Redis tier can't be run dry. */
export const MONTHLY_CAP = 60_000;
const HOUR_KEY_TTL_SEC = 50 * 3600;
const HOURS_SHOWN = 48;
const HOUR_MS = 3_600_000;

/**
 * Runs inside Redis via EVAL (Redis's server-side Lua, not JavaScript eval).
 * The script is a fixed constant; keys and args are built by this file, never
 * from request data. Atomic: throttle, monthly cap, then the counters.
 * Returns the new total, -1 when throttled, -2 when the month is full.
 */
const RECORD_SCRIPT = `
if not redis.call("SET", KEYS[1], "1", "NX", "EX", tonumber(ARGV[1])) then return -1 end
local month = redis.call("INCR", KEYS[2])
if month == 1 then redis.call("EXPIRE", KEYS[2], 3456000) end
if month > tonumber(ARGV[2]) then return -2 end
if redis.call("INCR", KEYS[3]) == 1 then redis.call("EXPIRE", KEYS[3], tonumber(ARGV[3])) end
return redis.call("INCR", KEYS[4])
`;

const hourKey = (startMs: number) => `pings:h:${startMs}`;

/** Browsers send Origin on POST; it must match the host the request came to. */
export function isSameOrigin(origin: string | null, host: string | null): boolean {
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Salted so the throttle key can't be reversed into an address. Raw IPs are never stored. */
export function hashIp(ip: string, salt: string): string {
  return createHmac("sha256", salt).update(ip).digest("hex").slice(0, 32);
}

export type RecordResult = { ok: true; total: number } | { ok: false; reason: "throttled" | "full" };

export async function recordPing(store: PingStore, ipHash: string, nowMs: number): Promise<RecordResult> {
  const month = new Date(nowMs).toISOString().slice(0, 7);
  const result = Number(
    await store.eval(
      RECORD_SCRIPT,
      [`rl:${ipHash}`, `pings:m:${month}`, hourKey(hourStart(nowMs)), "pings:total"],
      [String(THROTTLE_SEC), String(MONTHLY_CAP), String(HOUR_KEY_TTL_SEC)],
    ),
  );
  if (result === -1) return { ok: false, reason: "throttled" };
  if (result === -2) return { ok: false, reason: "full" };
  return { ok: true, total: result };
}

export type PingCounts = { total: number; hours: { startMs: number; count: number }[] };

/** Total plus the last 48 hourly buckets, in a single MGET. Empty hours are left out. */
export async function readPings(store: PingStore, nowMs: number): Promise<PingCounts> {
  const current = hourStart(nowMs);
  const starts = Array.from({ length: HOURS_SHOWN }, (_, i) => current - i * HOUR_MS);
  const [total, ...counts] = await store.mget("pings:total", ...starts.map(hourKey));
  return {
    total: Number(total) || 0,
    hours: starts
      .map((startMs, i) => ({ startMs, count: Number(counts[i]) || 0 }))
      .filter((h) => h.count > 0),
  };
}
