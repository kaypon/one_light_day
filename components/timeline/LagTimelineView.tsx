"use client";

import { useEffect, useRef, useState } from "react";
import { formatDelay } from "@/lib/format";
import { useElementWidth } from "@/lib/useElementWidth";
import s from "./LagTimeline.module.css";

export type Chapter = {
  id: string;
  when: string;
  text: string;
  ms: number | null;
  delaySec: number;
  plotted: boolean;
};

type Props = { chapters: Chapter[]; curve: { ms: number; hours: number }[] };

// Gauge: log scale from one second to about three years.
const GAUGE_MAX_LOG = 8;
const GAUGE_TICKS = [
  { sec: 1, label: "1 sec" },
  { sec: 60, label: "1 min" },
  { sec: 3_600, label: "1 hr" },
  { sec: 86_400, label: "1 day" },
  { sec: 31_557_600, label: "1 yr" },
];
const gaugePct = (sec: number) => Math.min(100, Math.max(0, (Math.log10(Math.max(sec, 1)) / GAUGE_MAX_LOG) * 100));

export function LagTimelineView({ chapters, curve }: Props) {
  const [active, setActive] = useState(0);
  const items = useRef<(HTMLLIElement | null)[]>([]);

  // The chapter crossing a band just above the middle of the screen is the active one.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    for (const el of items.current) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const chapter = chapters[active];

  return (
    <section id="lag" className={s.section} aria-labelledby="lag-title">
      <div className={s.head}>
        <h2 id="lag-title" className={s.title}>
          49 years of lag.
        </h2>
        <p className={s.intro}>
          Every mile Voyager covers adds to the wait for anything sent to it. Scroll through the trip and
          watch the delay grow from about a second to a full day.
        </p>
      </div>

      <div className={s.layout}>
        <div className={s.panel}>
          <p className={s.panelLabel}>Signal delay, {chapter.when}</p>
          <p className={s.panelValue}>{formatDelay(chapter.delaySec)}</p>
          <div className={s.gauge} aria-hidden="true">
            <div className={s.gaugeTrack}>
              <div className={s.gaugeFill} style={{ width: `${gaugePct(chapter.delaySec)}%` }} />
            </div>
            {GAUGE_TICKS.map((t) => (
              <span key={t.sec} className={s.gaugeTick} style={{ left: `${gaugePct(t.sec)}%` }}>
                {t.label}
              </span>
            ))}
          </div>
          <LongView curve={curve} chapters={chapters} active={active} />
        </div>

        <ol className={s.chapters}>
          {chapters.map((c, i) => (
            <li
              key={c.id}
              ref={(el) => {
                items.current[i] = el;
              }}
              data-index={i}
              className={i === active ? `${s.chapter} ${s.current}` : s.chapter}
            >
              <p className={s.when}>{c.when}</p>
              <p className={s.text}>{c.text}</p>
              <p className={s.delay}>Signal delay: {formatDelay(c.delaySec)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const HEIGHT = 150;
const M = { top: 10, right: 10, bottom: 22, left: 34 };
const yearFmt = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

/** Light-time over the whole mission, with the chapters marked on it. */
function LongView({ curve, chapters, active }: { curve: Props["curve"]; chapters: Chapter[]; active: number }) {
  const { ref, width } = useElementWidth<HTMLDivElement>(320);
  const [hover, setHover] = useState<number | null>(null);

  const x0 = curve[0].ms;
  const x1 = curve[curve.length - 1].ms;
  const yMax = Math.ceil(Math.max(...curve.map((p) => p.hours)) / 6) * 6;
  const innerW = Math.max(1, width - M.left - M.right);
  const innerH = HEIGHT - M.top - M.bottom;
  const px = (ms: number) => M.left + ((ms - x0) / (x1 - x0)) * innerW;
  const py = (h: number) => M.top + (1 - h / yMax) * innerH;
  const line = curve.map((p, i) => `${i ? "L" : "M"}${px(p.ms).toFixed(1)},${py(p.hours).toFixed(1)}`).join("");
  const yTicks = Array.from({ length: yMax / 6 + 1 }, (_, i) => i * 6);
  const decades = [1980, 1990, 2000, 2010, 2020, 2030].map((y) => Date.UTC(y, 0, 1)).filter((t) => t <= x1);
  const hovered = hover === null ? null : curve[hover];

  return (
    <div ref={ref} className={s.longView}>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label="Signal delay to Voyager 1 from 1977 to 2030, climbing from zero to over 24 hours."
      >
        {yTicks.map((h) => (
          <g key={h}>
            <line className={s.grid} x1={M.left} x2={width - M.right} y1={py(h)} y2={py(h)} />
            <text className={s.axisText} x={M.left - 6} y={py(h) + 4} textAnchor="end">
              {h}h
            </text>
          </g>
        ))}
        {decades.map((t) => (
          <text key={t} className={s.axisText} x={px(t)} y={HEIGHT - 6} textAnchor="middle">
            {new Date(t).getUTCFullYear()}
          </text>
        ))}
        <path className={s.series} d={line} />
        {chapters.map((c, i) =>
          c.plotted && c.ms !== null ? (
            <circle
              key={c.id}
              className={i === active ? s.markActive : s.mark}
              cx={px(c.ms)}
              cy={py(c.delaySec / 3600)}
              r={i === active ? 5 : 3}
            />
          ) : null,
        )}
        {hovered && (
          <line className={s.cursor} x1={px(hovered.ms)} x2={px(hovered.ms)} y1={M.top} y2={HEIGHT - M.bottom} />
        )}
        <rect
          className={s.hit}
          x={M.left}
          y={M.top}
          width={innerW}
          height={innerH}
          onPointerMove={(e) => {
            const box = e.currentTarget.getBoundingClientRect();
            const frac = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
            setHover(Math.round(frac * (curve.length - 1)));
          }}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {hovered && (
        <div
          className={s.tooltip}
          style={{ left: Math.min(Math.max(px(hovered.ms), 60), width - 60), top: 0 }}
          aria-hidden="true"
        >
          <strong>{formatDelay(hovered.hours * 3600)}</strong>
          <span>{yearFmt.format(hovered.ms)}</span>
        </div>
      )}
    </div>
  );
}
