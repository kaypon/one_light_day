"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

// Module-level so the default never changes identity (it's an effect dependency).
function replace<T>(_prev: T | null, next: T): T {
  return next;
}

/**
 * Fetches JSON on mount (even in a background tab), then every `intervalMs`
 * while the page is visible, and again whenever it becomes visible. Bad or
 * failed responses keep the last good data; `failed` says whether the
 * latest attempt worked.
 */
export function usePolledJson<T>(
  url: string,
  isValid: (data: unknown) => data is T,
  intervalMs: number,
  /** How a polled result combines with what's already shown (default: replace it). Keep it stable. */
  merge: (prev: T | null, next: T) => T = replace,
): { data: T | null; failed: boolean; setData: Dispatch<SetStateAction<T | null>> } {
  const [data, setData] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    const load = () => {
      fetch(url)
        .then((res) => (res.ok ? res.json() : null))
        .then((json: unknown) => {
          if (!live) return;
          if (isValid(json)) {
            setData((prev) => merge(prev, json));
            setFailed(false);
          } else {
            setFailed(true);
          }
        })
        .catch(() => {
          if (live) setFailed(true);
        });
    };
    load();
    const id = window.setInterval(() => {
      if (!document.hidden) load();
    }, intervalMs);
    const onVisibility = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      live = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [url, isValid, intervalMs, merge]);

  return { data, failed, setData };
}
