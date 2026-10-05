"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { C_KM_S, LIGHT_DAY_KM, MILESTONE_MS } from "@/lib/constants";
import { sample } from "@/lib/ephemeris";
import { formatNumber, lightTimeParts } from "@/lib/format";
import { useEphemeris } from "@/lib/useEphemeris";
import { useNow } from "@/lib/useNow";
import { OrbitDiagram } from "./OrbitDiagram";
import { WobbleChart, type ChartPoint } from "./WobbleChart";
import s from "./WobbleSection.module.css";

const DAY = 86_400_000;
export const WINDOW_START = Date.UTC(2026, 9, 1);
export const WINDOW_END = Date.UTC(2027, 11, 31);
const PLAY_MS = 12_000; // the whole window in 12 seconds

const dateLabel = (ms: number) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(ms);
const clampDay = (ms: number) => Math.min(WINDOW_END, Math.max(WINDOW_START, Math.round(ms / DAY) * DAY));

export function WobbleSection() {
  const { data } = useEphemeris();
  const now = useNow();
  const [picked, setPicked] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const selected = picked ?? clampDay(now ?? MILESTONE_MS);

  const points: ChartPoint[] = useMemo(() => {
    if (!data) return [];
    const out: ChartPoint[] = [];
    for (let t = WINDOW_START; t <= WINDOW_END; t += DAY) {
      const g = sample(data.geo, t);
      if (g) out.push({ ms: t, hours: g.rangeKm / C_KM_S / 3600, rate: g.rateKmS });
    }
    return out;
  }, [data]);

  // "Play the year": sweep the selection forward, then stop.
  const playFrom = useRef({ start: 0, from: 0 });
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const step = (t: number) => {
      const { start, from } = playFrom.current;
      const next = from + ((t - start) / PLAY_MS) * (WINDOW_END - WINDOW_START);
      if (next >= WINDOW_END) {
        setPicked(WINDOW_END);
        setPlaying(false);
        return;
      }
      setPicked(clampDay(next));
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  function play() {
    const from = selected >= WINDOW_END - DAY ? WINDOW_START : selected;
    playFrom.current = { start: performance.now(), from };
    setPlaying(true);
  }

  function pick(ms: number) {
    setPlaying(false);
    setPicked(clampDay(ms));
  }

  const geo = data ? sample(data.geo, selected) : null;
  const helio = data ? sample(data.helio, selected) : null;
  const earthPart = geo && helio ? helio.rateKmS - geo.rateKmS : null; // + means Earth is moving toward Voyager

  return (
    <section id="wobble" className={s.section} aria-labelledby="wobble-title">
      <div className={s.head}>
        <h2 id="wobble-title" className={s.title}>
          The wobble.
        </h2>
        <p className={s.intro}>
          Voyager 1 flies outward at a steady 17 km/s, but the distance to it doesn&apos;t grow evenly.
          Earth circles the Sun at 30 km/s, swinging toward Voyager for half the year and away for the
          other half. From late January to late April, Earth closes in faster than Voyager flies off, and
          the gap actually shrinks. It&apos;s also why the light-day lands in November: right now Earth is
          swinging away, adding to the gap.
        </p>
      </div>

      <div className={s.layout}>
        <div className={s.diagramCol}>
          <OrbitDiagram selectedMs={selected} onPick={pick} />
        </div>

        <div className={s.chartCol}>
          <WobbleChart points={points} selectedMs={selected} onPick={pick} />

          <div className={s.controls}>
            <label className={s.sliderLabel} htmlFor="wobble-date">
              Date: <strong>{dateLabel(selected)}</strong>
            </label>
            <input
              id="wobble-date"
              className={s.slider}
              type="range"
              min={WINDOW_START}
              max={WINDOW_END}
              step={DAY}
              value={selected}
              aria-valuetext={dateLabel(selected)}
              onChange={(e) => pick(Number(e.target.value))}
            />
            <div className={s.buttons}>
              <button type="button" className={s.button} onClick={() => (playing ? setPlaying(false) : play())}>
                {playing ? "Pause" : "Play the year"}
              </button>
              <button type="button" className={s.button} onClick={() => pick(now ?? MILESTONE_MS)}>
                Today
              </button>
            </div>
          </div>

          <div className={s.readout} aria-live="off">
            {geo && helio && earthPart !== null ? (
              <>
                <p className={s.readoutValue}>
                  {lightTimeParts(geo.rangeKm / C_KM_S).clock} of light
                  {geo.rangeKm >= LIGHT_DAY_KM ? ", past one light-day" : ""}
                </p>
                <p>
                  The gap is {geo.rateKmS >= 0 ? "growing" : "shrinking"} at{" "}
                  {formatNumber(Math.abs(geo.rateKmS), 2)} km/s. Voyager flies outward at{" "}
                  {formatNumber(helio.rateKmS, 2)} km/s, and Earth&apos;s orbit is carrying us{" "}
                  {earthPart >= 0 ? "toward" : "away from"} it at {formatNumber(Math.abs(earthPart), 2)} km/s.
                </p>
              </>
            ) : (
              <p className={s.muted}>Loading the trajectory…</p>
            )}
          </div>
        </div>
      </div>

      {points.length > 0 && (
        <details className={s.table}>
          <summary>Show the numbers</summary>
          <table>
            <thead>
              <tr>
                <th scope="col">Date (UTC)</th>
                <th scope="col">Light-time</th>
                <th scope="col">Distance (km)</th>
                <th scope="col">Change (km/s)</th>
              </tr>
            </thead>
            <tbody>
              {points
                .filter((p) => new Date(p.ms).getUTCDate() === 1)
                .map((p) => (
                  <tr key={p.ms}>
                    <td>{dateLabel(p.ms)}</td>
                    <td>{lightTimeParts(p.hours * 3600).clock}</td>
                    <td>{formatNumber(p.hours * 3600 * C_KM_S, 0)}</td>
                    <td>{formatNumber(p.rate, 2)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </details>
      )}
    </section>
  );
}
