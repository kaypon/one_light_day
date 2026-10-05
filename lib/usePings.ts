"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { MAX_STORED_PINGS, parseStoredPings, withLocalPing, type Counts, type Ping } from "./pings";

// ---- Your pings: kept in this browser only. ----

const STORAGE_KEY = "one-light-day.pings.v1";
const EMPTY: Ping[] = [];
let cache: Ping[] | null = null;
const listeners = new Set<() => void>();

function read(): Ping[] {
  if (cache) return cache;
  try {
    cache = parseStoredPings(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    cache = []; // storage blocked (private mode, embeds): pings live for this visit only
  }
  return cache;
}

function write(next: Ping[]) {
  cache = next.slice(0, MAX_STORED_PINGS);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Same as above: keep going in memory.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useMyPings() {
  const pings = useSyncExternalStore(subscribe, read, () => EMPTY);
  const add = useCallback((ping: Ping) => write([ping, ...read()]), []);
  const remove = useCallback((id: string) => write(read().filter((p) => p.id !== id)), []);
  return { pings, add, remove };
}

// ---- Everyone's pings: anonymous hourly counts from /api/pings. ----

const POLL_MS = 60_000;

function isCounts(data: unknown): data is Counts {
  const d = data as Counts | null;
  return typeof d?.total === "number" && Array.isArray(d.hours);
}

export function useGlobalPings() {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    let live = true;
    const load = () => {
      fetch("/api/pings")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (live && isCounts(data)) setCounts(data);
        })
        .catch(() => {}); // counter is a bonus; the page works without it
    };
    // Always once on mount (even in a background tab), then only while visible.
    load();
    const id = window.setInterval(() => {
      if (!document.hidden) load();
    }, POLL_MS);
    const onVisibility = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      live = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  /** Counts the ping globally. Resolves false when the server declines (throttle, cap, outage). */
  const report = useCallback(async () => {
    try {
      const res = await fetch("/api/pings", { method: "POST" });
      if (!res.ok) return false;
      const { total } = (await res.json()) as { total: number };
      setCounts((c) => withLocalPing(c ?? { total: 0, hours: [] }, total, Date.now()));
      return true;
    } catch {
      return false;
    }
  }, []);

  return { counts, report };
}
