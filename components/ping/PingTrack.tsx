"use client";

import { useEffect, useRef } from "react";
import { LIGHT_DAY_KM } from "@/lib/constants";
import { MILESTONES } from "@/lib/milestones";
import type { Position } from "@/lib/pings";

export type TrackScale = "log" | "true";

type Props = {
  scale: TrackScale;
  voyagerKm: number | null;
  mine: Position[];
  others: Position[];
  label: string;
  className?: string;
};

const EARTH_RADIUS_KM = 6_371;
// Same side-view glyph as the hero drawing, as canvas paths.
const VOYAGER_SHAPES = ["M9 2.5 Q2.5 11 9 19.5 Z", "M9.5 8.5 h6 v5 h-6 Z", "M18 18 h4.5 v2.6 h-4.5 Z", "M17 1 h4 v3 h-4 Z"];
const VOYAGER_LINES = "M15.5 11 H30.5 M13 13.5 L18.5 19 M13 8.5 L17.5 3.5";

/** Spreads anonymous dots into a band around the line, the same way every frame. */
const jitter = (i: number) => (((i * 2_654_435_761) >>> 0) % 1000) / 500 - 1;

/**
 * The Earth → Voyager track, redrawn every frame. Log scale gives every
 * landmark room; true scale shows how empty it really is.
 */
export function PingTrack({ scale, voyagerKm, mine, others, label, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useRef({ w: 0, h: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(([entry]) => {
      size.current = { w: entry.contentRect.width, h: entry.contentRect.height };
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // Positions change every frame, so draw after every render.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const { w, h } = size.current;
    if (!canvas || !ctx || !w || !h) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const css = getComputedStyle(canvas);
    const ink = css.getPropertyValue("--ink").trim() || "#191611";
    const muted = css.getPropertyValue("--muted").trim() || "#756b59";
    const signal = css.getPropertyValue("--signal").trim() || "#ff4f00";
    const paper = css.getPropertyValue("--paper").trim() || "#f2f2f0";
    const font = `11px ${css.fontFamily}`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const left = 12;
    const right = w - 28;
    const y = Math.round(h * 0.6);
    const maxKm = Math.max(voyagerKm ?? LIGHT_DAY_KM, LIGHT_DAY_KM);
    const l0 = Math.log10(EARTH_RADIUS_KM);
    const l1 = Math.log10(maxKm);
    const x = (km: number) =>
      scale === "log"
        ? left + (right - left) * Math.max(0, (Math.log10(Math.max(km, EARTH_RADIUS_KM)) - l0) / (l1 - l0))
        : left + (right - left) * Math.min(1, Math.max(0, km / maxKm));

    // The line.
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();

    // Landmarks: ticks always, labels on two rows where they fit.
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.lineWidth = 1;
    const rowEnd = [-Infinity, -Infinity];
    for (const m of MILESTONES) {
      const mx = x(m.km);
      ctx.strokeStyle = muted;
      ctx.beginPath();
      ctx.moveTo(mx, y - 5);
      ctx.lineTo(mx, y + 5);
      ctx.stroke();
      const half = ctx.measureText(m.short).width / 2;
      for (const row of [0, 1]) {
        if (mx - half > rowEnd[row] + 8 && mx - half > 0 && mx + half < w - 4) {
          ctx.fillStyle = muted;
          ctx.fillText(m.short, mx, y - 13 - row * 15);
          rowEnd[row] = mx + half;
          break;
        }
      }
    }

    // Earth (⊕) and Voyager.
    ctx.fillStyle = paper;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(left, y, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(left - 6.5, y);
    ctx.lineTo(left + 6.5, y);
    ctx.moveTo(left, y - 6.5);
    ctx.lineTo(left, y + 6.5);
    ctx.stroke();

    const vx = x(maxKm);
    ctx.save();
    ctx.translate(vx - 9, y - 11);
    ctx.fillStyle = paper;
    for (const d of VOYAGER_SHAPES) {
      const p = new Path2D(d);
      ctx.fill(p);
      ctx.stroke(p);
    }
    ctx.stroke(new Path2D(VOYAGER_LINES));
    ctx.restore();

    ctx.fillStyle = ink;
    ctx.textAlign = "left";
    ctx.fillText("Earth", left - 6, y + 28);
    ctx.textAlign = "right";
    ctx.fillText("Voyager 1", w - 2, y + 28);

    // Everyone else's pings: small, quiet, scattered into a band.
    ctx.fillStyle = muted;
    ctx.strokeStyle = muted;
    ctx.lineWidth = 1;
    others.forEach((p, i) => {
      const px = x(p.km);
      const py = y + jitter(i) * 11;
      ctx.beginPath();
      ctx.arc(px, py, 1.7, 0, Math.PI * 2);
      if (p.phase === "outbound") ctx.fill();
      else ctx.stroke();
    });

    // Yours: signal orange with a short trail behind the direction of travel.
    for (const p of mine) {
      const px = x(p.km);
      const dir = p.phase === "outbound" ? -1 : 1;
      const trail = ctx.createLinearGradient(px + dir * 26, y, px, y);
      trail.addColorStop(0, "rgba(255, 79, 0, 0)");
      trail.addColorStop(1, signal);
      ctx.strokeStyle = trail;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px + dir * 26, y);
      ctx.lineTo(px, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(px, y, 4.5, 0, Math.PI * 2);
      if (p.phase === "outbound") {
        ctx.fillStyle = signal;
        ctx.fill();
      } else {
        ctx.fillStyle = paper;
        ctx.fill();
        ctx.strokeStyle = signal;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  });

  return <canvas ref={canvasRef} role="img" aria-label={label} className={className} />;
}
