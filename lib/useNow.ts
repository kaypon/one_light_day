"use client";

import { useSyncExternalStore } from "react";
import { createClock, parseOverride } from "./clock";

// One shared ticker for the whole page. Every frame normally; once a second
// for visitors who ask for reduced motion. Null on the server and during
// hydration, so time-dependent text never mismatches the static HTML.

let clock: ((realMs: number) => number) | null = null;
let current = 0;
let stop: (() => void) | null = null;
const listeners = new Set<() => void>();

function ensureClock() {
  if (!clock) {
    clock = createClock(parseOverride(window.location.search), Date.now());
    current = clock(Date.now());
  }
  return clock;
}

function emit() {
  current = ensureClock()(Date.now());
  listeners.forEach((listener) => listener());
}

function start() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const id = window.setInterval(emit, 1000);
    return () => window.clearInterval(id);
  }
  let frame = requestAnimationFrame(function loop() {
    emit();
    frame = requestAnimationFrame(loop);
  });
  return () => cancelAnimationFrame(frame);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) stop = start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stop?.();
      stop = null;
    }
  };
}

function getSnapshot() {
  ensureClock();
  return current;
}

const getServerSnapshot = () => null;

/**
 * The page's time right now, read fresh. Use this in event handlers: the
 * ticker's last value can be stale when the browser has paused animation
 * frames (background tabs), which would back-date anything stamped with it.
 */
export function currentTime(): number {
  return ensureClock()(Date.now());
}

export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
