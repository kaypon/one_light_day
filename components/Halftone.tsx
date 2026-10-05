"use client";

import { useEffect, useRef } from "react";

type Props = {
  src: string;
  alt: string;
  /** Dot pitch in CSS pixels. */
  cell?: number;
  /** Screen angle in degrees. 45° is the classic black-ink screen. */
  angle?: number;
  /** Crop anchor, 0–1 on each axis (like object-position). */
  focusX?: number;
  focusY?: number;
  className?: string;
};

const ROWS_PER_FRAME = 14;

/**
 * Re-screens a photo as an ink halftone on a canvas. Dot area follows
 * darkness, on a rotated grid, cropped like object-fit: cover. The ink
 * color comes from the canvas's CSS `color`.
 */
export function Halftone({ src, alt, cell = 5, angle = 45, focusX = 0.5, focusY = 0.5, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new Image();
    let observer: ResizeObserver | undefined;
    let frame = 0;
    let cancelled = false;

    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      // Sample the photo at half the dot pitch.
      const step = cell / 2;
      const sw = Math.ceil(width / step);
      const sh = Math.ceil(height / step);
      const sampler = document.createElement("canvas");
      sampler.width = sw;
      sampler.height = sh;
      const sctx = sampler.getContext("2d", { willReadFrequently: true });
      const ctx = canvas.getContext("2d");
      if (!sctx || !ctx) return;
      const scale = Math.max(sw / img.naturalWidth, sh / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      sctx.drawImage(img, (sw - dw) * focusX, (sh - dh) * focusY, dw, dh);
      const px = sctx.getImageData(0, 0, sw, sh).data;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = getComputedStyle(canvas).color;

      const a = (angle * Math.PI) / 180;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const reach = Math.hypot(width, height) / 2 + cell;
      const maxR = cell * 0.62; // a touch over half-pitch so solid blacks close up

      // Print a band of screen rows per frame: no long main-thread task,
      // and the photo comes in like a slow transmission.
      let v = -reach;
      const band = () => {
        const stop = Math.min(reach, v + cell * ROWS_PER_FRAME);
        ctx.beginPath();
        for (; v <= stop; v += cell) {
          for (let u = -reach; u <= reach; u += cell) {
            const x = width / 2 + u * cos - v * sin;
            const y = height / 2 + u * sin + v * cos;
            if (x < -cell || y < -cell || x > width + cell || y > height + cell) continue;
            const sx = Math.min(sw - 1, Math.max(0, Math.floor(x / step)));
            const sy = Math.min(sh - 1, Math.max(0, Math.floor(y / step)));
            const i = (sy * sw + sx) * 4;
            const lum = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
            const r = maxR * Math.sqrt(1 - lum);
            if (r < 0.35) continue;
            ctx.moveTo(x + r, y);
            ctx.arc(x, y, r, 0, Math.PI * 2);
          }
        }
        ctx.fill();
        if (v <= reach) frame = requestAnimationFrame(band);
      };
      band();
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };

    // Don't load or draw anything until the photo is about to be seen.
    const viewport = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        viewport.disconnect();
        img.onload = () => {
          if (cancelled) return;
          observer = new ResizeObserver(schedule);
          observer.observe(canvas);
        };
        img.src = src;
      },
      { rootMargin: "200px" },
    );
    viewport.observe(canvas);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      viewport.disconnect();
      observer?.disconnect();
    };
  }, [src, cell, angle, focusX, focusY]);

  return <canvas ref={canvasRef} role="img" aria-label={alt} className={className} />;
}
