"use client";

import { useState } from "react";
import { countdown, type Countdown } from "@/lib/clock";
import { LIGHT_DAY_KM, MILESTONE_MS, MOON_KM } from "@/lib/constants";
import { lightTimeSec, sample } from "@/lib/ephemeris";
import {
  formatDistance,
  formatNumber,
  lightTimeParts,
  momentLabel,
  type DistanceUnit,
} from "@/lib/format";
import { useEphemeris } from "@/lib/useEphemeris";
import { useNow } from "@/lib/useNow";
import { Drawing } from "./Drawing";
import { Halftone } from "./Halftone";
import s from "./Hero.module.css";

const DAY_MS = 86_400_000;
/** How long after the moment the "It happened." stamp stays on the page. */
const STAMP_DAYS = 7;
const UNITS: { id: DistanceUnit; label: string }[] = [
  { id: "km", label: "km" },
  { id: "mi", label: "mi" },
  { id: "au", label: "AU" },
];

const pad2 = (n: number) => String(n).padStart(2, "0");
const span = (c: Countdown) => `${c.days}d ${pad2(c.hours)}h ${pad2(c.minutes)}m ${pad2(c.seconds)}s`;

export function Hero() {
  const now = useNow();
  const { data, failed } = useEphemeris();
  const [unit, setUnit] = useState<DistanceUnit>("km");

  const after = now !== null && now >= MILESTONE_MS;
  const geo = now !== null && data ? sample(data.geo, now) : null;
  const helio = now !== null && data ? sample(data.helio, now) : null;
  const tick = now !== null ? countdown(now) : null;
  const light = geo ? lightTimeParts(lightTimeSec(geo.rangeKm)) : null;
  const gapKm = geo ? LIGHT_DAY_KM - geo.rangeKm : null; // negative once past
  const outOfRange = now !== null && data !== null && geo === null;
  const showStamp = after && now - MILESTONE_MS < STAMP_DAYS * DAY_MS;

  const problem = failed
    ? "The trajectory data didn't load. Reload the page to try again."
    : outOfRange
      ? "This page's trajectory data covers 2026 through 2030 and needs a refresh."
      : null;

  return (
    <section className={s.sheet} aria-labelledby="hero-title">
      <span className={`${s.reg} ${s.regTL}`} aria-hidden="true" />
      <span className={`${s.reg} ${s.regTR}`} aria-hidden="true" />
      <span className={`${s.reg} ${s.regBL}`} aria-hidden="true" />
      <span className={`${s.reg} ${s.regBR}`} aria-hidden="true" />

      <div className={s.grid}>
        <div className={s.copy}>
          <h1 id="hero-title" className={s.title}>
            Voyager 1 is {showStamp ? "officially" : after ? "more than" : "about to be"}{" "}
            <span className={s.nowrap}>one light-day</span> from Earth.
          </h1>

          <div className={s.clockBlock}>
            <p className={s.clock} aria-hidden="true">
              <span>{light ? light.clock : "--:--:--"}</span>
              <span className={s.micro}>.{light ? light.micro : "------"}</span>
            </p>
            {showStamp && (
              <p className={s.stamp} aria-hidden="true">
                It happened.
                <small>18 Nov 2026, 10:16:07 UTC</small>
              </p>
            )}
          </div>
          <p className={s.caption}>How long light takes to reach it right now.</p>
          {geo && <p className="sr-only">{spokenLightTime(lightTimeSec(geo.rangeKm))}</p>}

          <p className={s.body}>
            {after
              ? "The clock passed 24:00:00 on Nov 18, 2026. Nothing we've built had been a full day of light away before. Voyager 1 launched in 1977 and it hasn't stopped."
              : "When that clock hits 24:00:00, Voyager 1 is a full day of light from home, a first for anything we've built. It launched in 1977 and it hasn't stopped."}
          </p>
          {problem && (
            <p className={s.problem} role="status">
              {problem}
            </p>
          )}
        </div>

        <figure className={s.photo}>
          <Halftone
            className={s.photoCanvas}
            src="/img/voyager1-launch-1977.jpg"
            alt="Voyager 1's Titan rocket lifting off in a column of smoke, September 5, 1977."
            cell={4.5}
            focusY={0.35}
          />
          <figcaption className={s.photoCaption}>
            Sept 5, 1977, 8:56 a.m. Voyager 1 lifts off from Florida on a Titan IIIE.
            <span className={s.credit}>Photo: NASA/JPL-Caltech/KSC</span>
          </figcaption>
        </figure>
      </div>

      <Drawing
        phase={after ? "after" : "before"}
        spanA={after ? "1 light-day" : geo ? formatDistance(geo.rangeKm, unit) : "—"}
        spanB={
          gapKm === null ? "—" : after ? `${formatDistance(-gapKm, unit)} past it` : `${formatDistance(gapKm, unit)} to go`
        }
        spanBNote={gapKm !== null && !after ? `${formatNumber(gapKm / MOON_KM, 0)} trips to the Moon` : undefined}
        description={
          geo && gapKm !== null
            ? after
              ? `Not-to-scale drawing: Voyager 1 is ${formatDistance(geo.rangeKm, unit)} from Earth, ${formatDistance(-gapKm, unit)} past the one-light-day mark.`
              : `Not-to-scale drawing: Voyager 1 is ${formatDistance(geo.rangeKm, unit)} from Earth, ${formatDistance(gapKm, unit)} short of the one-light-day mark.`
            : "Not-to-scale drawing of Earth, Voyager 1 and the one-light-day mark."
        }
      />

      <div className={s.units} role="group" aria-label="Distance units">
        <span className={s.unitsLabel}>Units</span>
        {UNITS.map((u) => (
          <button
            key={u.id}
            type="button"
            className={s.unit}
            aria-pressed={unit === u.id}
            onClick={() => setUnit(u.id)}
          >
            {u.label}
          </button>
        ))}
      </div>

      <dl className={s.cells}>
        <div className={s.cell}>
          <dt className={s.label}>{after ? "Clock passed 24:00:00" : "Clock hits 24:00:00 in"}</dt>
          <dd className={s.value}>{tick ? `${span(tick)}${after ? " ago" : ""}` : "—"}</dd>
        </div>

        <div className={s.cell}>
          <dt className={s.label}>
            {geo && geo.rateKmS < 0 ? "Earth is catching up at" : "Pulling away from Earth at"}
          </dt>
          <dd className={s.value}>{geo ? `${formatNumber(Math.abs(geo.rateKmS), 2)} km/s` : "—"}</dd>
          {geo && helio && <dd className={s.note}>{speedNote(geo.rateKmS, helio.rateKmS)}</dd>}
        </div>

        <div className={s.cell}>
          <dt className={s.label}>{now === null ? "In UTC" : "In your time zone"}</dt>
          <dd className={s.valueSmall}>{momentLabel(MILESTONE_MS, now === null ? "UTC" : undefined)}</dd>
          <dd className={s.note}>
            <a href="/one-light-day.ics" download className={s.calendar}>
              Add to calendar
            </a>
          </dd>
        </div>
      </dl>
    </section>
  );
}

function spokenLightTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor(sec / 60) % 60;
  const sRounded = Math.floor(sec) % 60;
  return `Light currently takes ${h} hours, ${m} minutes and ${sRounded} seconds to reach Voyager 1.`;
}

/** Splits the speed into Voyager's own motion and Earth's orbital swing. */
function speedNote(geoRate: number, helioRate: number): string {
  const own = formatNumber(helioRate, 2);
  const earth = geoRate - helioRate;
  if (Math.abs(earth) < 0.5) return `Almost all Voyager: it does ${own} km/s on its own.`;
  if (earth > 0) return `Voyager does ${own} km/s. Earth's orbit, swinging the other way, adds ${formatNumber(earth, 2)}.`;
  return `Voyager does ${own} km/s, but Earth's orbit is carrying us toward it at ${formatNumber(-earth, 2)}.`;
}
