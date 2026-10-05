"use client";

import { useRef } from "react";
import { earthLongitudeDeg, earthTowardVoyagerKmS, VOYAGER_LON_DEG } from "@/lib/orbit";
import { useElementWidth } from "@/lib/useElementWidth";
import s from "./WobbleSection.module.css";

type Props = { selectedMs: number; onPick: (ms: number) => void };

const DAY = 86_400_000;
const DEG_PER_DAY = 0.98561;
const RAD = Math.PI / 180;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

const earthTowardVoyagerSentence = (ms: number) =>
  earthTowardVoyagerKmS(ms) >= 0 ? "moving toward Voyager" : "moving away from Voyager";

/** Shortest signed angle from a to b, in degrees. */
const turn = (a: number, b: number) => ((((b - a) % 360) + 540) % 360) - 180;

/**
 * Top-down view of Earth's orbit, north up, looking down on the plane the
 * planets orbit in. Drag Earth (or use the arrow keys on it) to move the date.
 */
export function OrbitDiagram({ selectedMs, onPick }: Props) {
  const { ref, width } = useElementWidth<HTMLDivElement>(360);
  const dragging = useRef(false);

  const size = Math.min(width, 420);
  const c = size / 2;
  const r = size * 0.3;
  const at = (lonDeg: number, radius: number): [number, number] => [
    c + radius * Math.cos(lonDeg * RAD),
    c - radius * Math.sin(lonDeg * RAD),
  ];

  const lonE = earthLongitudeDeg(selectedMs);
  const [ex, ey] = at(lonE, r);
  const heading = (lonE + 90) * RAD;
  const vx = ex + Math.cos(heading) * size * 0.11;
  const vy = ey - Math.sin(heading) * size * 0.11;
  const cosE = Math.cos(lonE * RAD);
  const sinE = Math.sin(lonE * RAD);
  const [lx, ly0] = at(lonE, r - 18);
  const ly = ly0 + (sinE > 0.3 ? 12 : sinE < -0.3 ? -6 : 4);
  const anchor = cosE > 0.3 ? "end" : cosE < -0.3 ? "start" : "middle";

  const [tipX, tipY] = at(VOYAGER_LON_DEG, c - 10);
  const [baseX, baseY] = at(VOYAGER_LON_DEG, 12);

  function pickFromPointer(e: React.PointerEvent<SVGSVGElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - box.left - c;
    const y = c - (e.clientY - box.top);
    const lon = (Math.atan2(y, x) * 180) / Math.PI;
    onPick(selectedMs + (turn(lonE, lon) / DEG_PER_DAY) * DAY);
  }

  return (
    <div ref={ref} className={s.diagramBox}>
      <svg
        width={size}
        height={size}
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          pickFromPointer(e);
        }}
        onPointerMove={(e) => dragging.current && pickFromPointer(e)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
        className={s.diagram}
        aria-label={`Top-down diagram of Earth's orbit with the direction to Voyager 1. Earth is ${earthTowardVoyagerSentence(selectedMs)}.`}
        role="group"
      >
        <defs>
          <marker id="arrow-signal" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M0 0 L8 4 L0 8 Z" className={s.arrowSignal} />
          </marker>
          <marker id="arrow-ink" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M0 0 L8 4 L0 8 Z" className={s.arrowInk} />
          </marker>
        </defs>

        {/* Earth's orbit, with where Earth is on the 1st of each month. */}
        <circle className={s.orbit} cx={c} cy={c} r={r} />
        {MONTHS.map((m, i) => {
          const lon = earthLongitudeDeg(Date.UTC(2027, i, 1));
          const [ax, ay] = at(lon, r - 4);
          const [bx, by] = at(lon, r + 4);
          const [lx, ly] = at(lon, r + 17);
          return (
            <g key={m}>
              <line className={s.tick} x1={ax} y1={ay} x2={bx} y2={by} />
              <text className={s.axisText} x={lx} y={ly + 4} textAnchor="middle">
                {m}
              </text>
            </g>
          );
        })}

        {/* The way to Voyager 1, which sits 35° above this plane. */}
        <line className={s.voyagerRay} x1={baseX} y1={baseY} x2={tipX} y2={tipY} markerEnd="url(#arrow-signal)" />
        <text className={s.labelText} x={tipX + 10} y={tipY - 22}>
          To Voyager 1
        </text>
        <text className={s.axisText} x={tipX + 10} y={tipY - 8}>
          173 AU, 35° up
        </text>

        <circle className={s.sun} cx={c} cy={c} r={7} />
        <text className={s.axisText} x={c} y={c - 13} textAnchor="middle">
          Sun
        </text>

        {/* Earth, its motion, and which way that motion points. */}
        <line className={s.motion} x1={ex} y1={ey} x2={vx} y2={vy} markerEnd="url(#arrow-ink)" />
        <g
          className={s.earth}
          tabIndex={0}
          role="slider"
          aria-label="Earth's position in its orbit"
          aria-valuemin={0}
          aria-valuemax={365}
          aria-valuenow={Math.round(lonE)}
          aria-valuetext={dayFmt.format(selectedMs)}
          onKeyDown={(e) => {
            const days = e.shiftKey ? 7 : 1;
            if (e.key === "ArrowRight" || e.key === "ArrowUp") onPick(selectedMs + days * DAY);
            else if (e.key === "ArrowLeft" || e.key === "ArrowDown") onPick(selectedMs - days * DAY);
            else return;
            e.preventDefault();
          }}
        >
          <circle className={s.earthHit} cx={ex} cy={ey} r={18} />
          <circle className={s.earthBody} cx={ex} cy={ey} r={7.5} />
          <path className={s.earthCross} d={`M${ex - 7.5} ${ey} H${ex + 7.5} M${ex} ${ey - 7.5} V${ey + 7.5}`} />
        </g>
        {/* Labels sit inside the orbit, clear of the month marks outside it. */}
        <text className={s.labelText} x={lx} y={ly} textAnchor={anchor}>
          Earth
        </text>
      </svg>
      <p className={s.hint}>Drag Earth around its orbit, or focus it and use the arrow keys.</p>
    </div>
  );
}
