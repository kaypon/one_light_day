"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

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
            setData(json);
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
  }, [url, isValid, intervalMs]);

  return { data, failed, setData };
}
