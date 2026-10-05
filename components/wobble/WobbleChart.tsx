"use client";

import { useState } from "react";
import { MILESTONE_MS } from "@/lib/constants";
import { lightTimeParts } from "@/lib/format";
import { useElementWidth } from "@/lib/useElementWidth";
import s from "./WobbleSection.module.css";

export type ChartPoint = { ms: number; hours: number; rate: number };

type Props = { points: ChartPoint[]; selectedMs: number; onPick: (ms: number) => void };

const DAY = 86_400_000;
const HEIGHT = 250;
const M = { top: 26, right: 14, bottom: 30, left: 48 };
const pad2 = (n: number) => String(n).padStart(2, "0");
const hhmm = (hours: number) => {
  const minutes = Math.round(hours * 60);
  return `${Math.floor(minutes / 60)}:${pad2(minutes % 60)}`;
};
const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const dayFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** Light-time to Voyager 1, day by day, with the one-light-day line and the spring dip. */
export function WobbleChart({ points, selectedMs, onPick }: Props) {
  const { ref, width } = useElementWidth<HTMLDivElement>(640);
  const [hovering, setHovering] = useState(false);

  if (points.length < 2) {
    return <div ref={ref} className={s.chartBox} style={{ height: HEIGHT }} />;
  }

  const x0 = points[0].ms;
  const x1 = points[points.length - 1].ms;
  const hours = points.map((p) => p.hours);
  const yMin = Math.floor((Math.min(...hours, 24) - 0.02) * 6) / 6;
  const yMax = Math.ceil((Math.max(...hours, 24) + 0.02) * 6) / 6;
  const innerW = Math.max(1, width - M.left - M.right);
  const innerH = HEIGHT - M.top - M.bottom;
  const px = (ms: number) => M.left + ((ms - x0) / (x1 - x0)) * innerW;
  const py = (h: number) => M.top + (1 - (h - yMin) / (yMax - yMin)) * innerH;

  const line = points.map((p, i) => `${i ? "L" : "M"}${px(p.ms).toFixed(1)},${py(p.hours).toFixed(1)}`).join("");

  // Stretches where the distance is shrinking, straight from the data.
  const dips: [number, number][] = [];
  for (const p of points) {
    const last = dips[dips.length - 1];
    if (p.rate < 0) {
      if (last && last[1] === p.ms - DAY) last[1] = p.ms;
      else dips.push([p.ms, p.ms]);
    }
  }

  const yTicks: number[] = [];
  for (let h = yMin; h <= yMax + 1e-9; h += 1 / 6) yTicks.push(h);
  const monthStarts: number[] = [];
  for (let d = new Date(x0); d.getTime() <= x1; d.setUTCMonth(d.getUTCMonth() + 1, 1)) {
    if (d.getUTCDate() === 1) monthStarts.push(d.getTime());
  }
  const everyOther = innerW < 520;

  const index = Math.min(points.length - 1, Math.max(0, Math.round((selectedMs - x0) / DAY)));
  const sel = points[index];
  const sx = px(sel.ms);
  const sy = py(sel.hours);
  const tooltipLeft = Math.min(Math.max(sx, M.left + 60), width - 70);

  function pickFromPointer(e: React.PointerEvent<SVGRectElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
    onPick(x0 + frac * (x1 - x0));
  }

  return (
    <div ref={ref} className={s.chartBox}>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label="Light-time from Earth to Voyager 1, October 2026 to December 2027. It crosses one light-day on Nov 18, 2026, rises until late January, dips until late April, then climbs again."
      >
        {/* Grid and axes: solid hairlines, recessive. */}
        {yTicks.map((h) => (
          <g key={h}>
            <line className={s.grid} x1={M.left} x2={width - M.right} y1={py(h)} y2={py(h)} />
            <text className={s.axisText} x={M.left - 8} y={py(h) + 4} textAnchor="end">
              {hhmm(h)}
            </text>
          </g>
        ))}
        {monthStarts.map((ms, i) => {
          const d = new Date(ms);
          const label = d.getUTCMonth() === 0 ? String(d.getUTCFullYear()) : monthFmt.format(ms);
          return (
            <g key={ms}>
              <line className={s.grid} x1={px(ms)} x2={px(ms)} y1={HEIGHT - M.bottom} y2={HEIGHT - M.bottom + 4} />
              {(!everyOther || i % 2 === 0) && (
                <text className={s.axisText} x={px(ms)} y={HEIGHT - M.bottom + 18} textAnchor="middle">
                  {label}
                </text>
              )}
            </g>
          );
        })}

        {dips.map(([a, b]) => (
          <g key={a}>
            <rect className={s.dip} x={px(a)} y={M.top} width={Math.max(1, px(b) - px(a))} height={innerH} />
            <text className={s.axisText} x={(px(a) + px(b)) / 2} y={M.top - 8} textAnchor="middle">
              Closing in
            </text>
          </g>
        ))}

        <line className={s.threshold} x1={M.left} x2={width - M.right} y1={py(24)} y2={py(24)} />
        <text className={s.labelText} x={M.left + 6} y={py(24) - 6}>
          One light-day
        </text>

        <path className={s.series} d={line} />

        <circle className={s.crossing} cx={px(MILESTONE_MS)} cy={py(24)} r={4.5} />
        <text className={s.labelText} x={px(MILESTONE_MS) + 8} y={py(24) + 16}>
          Nov 18
        </text>

        <line className={s.cursor} x1={sx} x2={sx} y1={M.top} y2={HEIGHT - M.bottom} />
        <circle className={s.cursorDot} cx={sx} cy={sy} r={4.5} />

        {/* Scrub anywhere on the plot; the crosshair snaps to the nearest day. */}
        <rect
          className={s.hit}
          x={M.left}
          y={M.top}
          width={innerW}
          height={innerH}
          onPointerEnter={() => setHovering(true)}
          onPointerLeave={() => setHovering(false)}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setHovering(true);
            pickFromPointer(e);
          }}
          onPointerUp={(e) => e.pointerType !== "mouse" && setHovering(false)}
          onPointerMove={(e) => {
            if (e.pointerType === "mouse" || e.currentTarget.hasPointerCapture(e.pointerId)) pickFromPointer(e);
          }}
        />
      </svg>
      {hovering && (
        <div className={s.tooltip} style={{ left: tooltipLeft, top: Math.max(0, sy - 58) }} aria-hidden="true">
          <strong>{lightTimeParts(sel.hours * 3600).clock}</strong>
          <span>{dayFmt.format(sel.ms)}</span>
        </div>
      )}
    </div>
  );
}
