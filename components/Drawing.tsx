import type { ReactNode } from "react";
import s from "./Drawing.module.css";

type Props = {
  phase: "before" | "after";
  /** Dimension under Earth → middle mark. */
  spanA: ReactNode;
  /** Dimension under middle mark → end mark. */
  spanB: ReactNode;
  spanBNote?: ReactNode;
  /** Plain-language version of the drawing for screen readers. */
  description: string;
};

/**
 * Not-to-scale engineering drawing of the distance. Before the milestone it
 * reads Earth → Voyager 1 → one-light-day datum; after, the datum sits
 * between them and Voyager is out past it.
 */
export function Drawing({ phase, spanA, spanB, spanBNote, description }: Props) {
  const before = phase === "before";
  const voyager = (
    <>
      <span className={s.markLabel}>Voyager 1</span>
      <VoyagerGlyph />
    </>
  );
  const datum = (
    <>
      <span className={`${s.markLabel} ${s.signal}`}>1 light-day</span>
      <span className={s.datumLine} />
    </>
  );

  return (
    <figure className={s.drawing} data-phase={phase}>
      <div className={s.objects} aria-hidden="true">
        <span className={s.lineA} />
        <span className={s.lineB} />
        <span className={s.break}>
          <svg viewBox="0 0 14 22" width="14" height="22">
            <rect x="3" y="0" width="8" height="22" fill="var(--paper)" />
            <path d="M1 18 L7 4 M7 18 L13 4" stroke="currentColor" strokeWidth="1.4" fill="none" />
          </svg>
        </span>
        <span className={`${s.mark} ${s.earth}`}>
          <span className={s.markLabel}>Earth</span>
          <svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="9" cy="9" r="7.3" fill="var(--paper)" />
            <path d="M9 1.7 V16.3 M1.7 9 H16.3" />
          </svg>
        </span>
        <span className={`${s.mark} ${s.mid}`}>{before ? voyager : datum}</span>
        <span className={`${s.mark} ${s.end}`}>{before ? datum : voyager}</span>
      </div>

      <div className={s.dims} aria-hidden="true">
        <span className={`${s.dim} ${s.dimA}`}>
          <span className={s.arrowL} />
          <span className={s.arrowR} />
          <span className={s.dimLabel}>{spanA}</span>
        </span>
        <span className={`${s.dim} ${s.dimB}`}>
          <span className={s.arrowL} />
          <span className={s.arrowR} />
          <span className={s.dimLabel}>
            {spanB}
            {spanBNote && <span className={s.dimNote}>{spanBNote}</span>}
          </span>
        </span>
      </div>

      <figcaption className="sr-only">{description}</figcaption>
    </figure>
  );
}

function VoyagerGlyph() {
  // Side view, dish pointed back at Earth: high-gain antenna, bus, booms.
  return (
    <svg
      viewBox="0 0 32 22"
      width="32"
      height="22"
      fill="var(--paper)"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 2.5 Q2.5 11 9 19.5 Z" />
      <rect x="9.5" y="8.5" width="6" height="5" />
      <path d="M15.5 11 H30.5 M13 13.5 L18.5 19 M13 8.5 L17.5 3.5" fill="none" />
      <rect x="18" y="18" width="4.5" height="2.6" />
      <rect x="17" y="1" width="4" height="3" />
    </svg>
  );
}
