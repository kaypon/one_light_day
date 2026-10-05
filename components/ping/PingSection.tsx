"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { C_KM_S } from "@/lib/constants";
import { sample } from "@/lib/ephemeris";
import { formatDuration, formatHMS, formatNumber, shortMoment } from "@/lib/format";
import {
  MAX_NOTE_LENGTH,
  PING_COOLDOWN_SEC,
  dotsFromHours,
  lastMilestonePassed,
  pingPosition,
  pingTimeline,
  summarizeCounts,
  withoutMine,
  type Ping,
  type Position,
  type Timeline,
} from "@/lib/pings";
import { useEphemeris } from "@/lib/useEphemeris";
import { currentTime, useNow } from "@/lib/useNow";
import { useGlobalPings, useMyPings } from "@/lib/usePings";
import { PingTrack, type TrackFrame, type TrackScale } from "./PingTrack";
import s from "./PingSection.module.css";

const SPEEDS = [
  { factor: 1, label: "Real time" },
  { factor: 60, label: "1 min/s" },
  { factor: 3_600, label: "1 hr/s" },
  { factor: 86_400, label: "1 day/s" },
];
const DOTS_PER_HOUR = 40;
const DAY_MS = 86_400_000;

type Warp = { factor: number; t0: number; offset0: number };
const LIVE: Warp = { factor: 1, t0: 0, offset0: 0 };

const EMPTY_FRAME: TrackFrame = { scale: "log", voyagerKm: null, mine: [], others: [] };

export function PingSection() {
  // Text only needs a few updates a second; the track animates on its own loop.
  const realNow = useNow(250);
  const { data } = useEphemeris();
  const { pings, add, remove } = useMyPings();
  const { counts, report } = useGlobalPings();
  const [scale, setScale] = useState<TrackScale>("log");
  const [warp, setWarp] = useState<Warp>(LIVE);
  const [note, setNote] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const [copied, setCopied] = useState(false);

  // The track's own clock: real time, or running ahead at the chosen speed.
  const offset = (t: number) => warp.offset0 + (t - warp.t0) * (warp.factor - 1);
  const simNow = realNow === null ? null : realNow + offset(realNow);
  const ahead = realNow !== null && simNow !== null ? simNow - realNow : 0;

  const timelines = useMemo(() => {
    const map = new Map<string, Timeline | null>();
    if (data) for (const p of pings) map.set(p.id, pingTimeline(p.sentAt, data));
    return map;
  }, [pings, data]);

  // Departure times for everyone's pings only change when new counts arrive.
  const countsMinute = realNow === null ? 0 : Math.floor(realNow / 60_000);
  const departures = useMemo(
    () =>
      counts && countsMinute
        ? dotsFromHours(withoutMine(counts.hours, pings), countsMinute * 60_000, DOTS_PER_HOUR)
        : [],
    [counts, countsMinute, pings],
  );

  // What the track draws at any moment. Rebuilt after each render so the
  // canvas loop always sees the latest pings, counts, warp and scale.
  const frameRef = useRef<(realMs: number) => TrackFrame>(() => EMPTY_FRAME);
  useLayoutEffect(() => {
    frameRef.current = (real: number) => {
      const sim = real + offset(real);
      const voyagerNow = data ? sample(data.geo, sim) : null;
      const oneWayMs = voyagerNow ? (voyagerNow.rangeKm / C_KM_S) * 1000 : DAY_MS;
      const mine: Position[] = [];
      for (const p of pings) {
        const t = timelines.get(p.id);
        if (!t) continue;
        const pos = pingPosition(t, sim);
        if (pos.phase !== "home") mine.push(pos);
      }
      const others: Position[] = [];
      for (const dep of departures) {
        const age = sim - dep;
        if (age < oneWayMs) others.push({ phase: "outbound", km: (C_KM_S * age) / 1000 });
        else if (age < 2 * oneWayMs) others.push({ phase: "reply", km: (C_KM_S * (2 * oneWayMs - age)) / 1000 });
      }
      return { scale, voyagerKm: voyagerNow?.rangeKm ?? null, mine, others };
    };
  });

  const latest = pings[0];
  const latestTimeline = latest ? timelines.get(latest.id) : null;
  const cooling = realNow !== null && realNow < cooldownUntil;
  const canSend = Boolean(data) && realNow !== null && !cooling;
  const summary = counts && realNow !== null ? summarizeCounts(counts, realNow) : null;

  function setSpeed(factor: number) {
    const t = currentTime(); // exact, so switching speeds never jumps the track
    setWarp(factor === 1 && ahead === 0 ? LIVE : { factor, t0: t, offset0: offset(t) });
  }

  function send() {
    if (!canSend || !data) return;
    const sentAt = currentTime();
    const ping: Ping = { id: crypto.randomUUID(), sentAt };
    const trimmed = note.trim().slice(0, MAX_NOTE_LENGTH);
    if (trimmed) ping.note = trimmed;
    add(ping);
    setNote("");
    setWarp(LIVE); // watch it leave from the start
    setCooldownUntil(sentAt + PING_COOLDOWN_SEC * 1000);
    const t = pingTimeline(ping.sentAt, data);
    setAnnouncement(t ? `Ping sent. It reaches Voyager 1 ${shortMoment(t.arrivesAt)}.` : "Ping sent.");
    void report();
  }

  async function share() {
    if (!latestTimeline) return;
    const text = `My ping reaches Voyager 1 ${shortMoment(latestTimeline.arrivesAt)}. Light needs a full day to get there.`;
    const url = window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ text, url });
        return;
      }
    } catch {
      // Fall through to copying (share sheets are blocked inside embeds).
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked too; nothing else to try.
    }
  }

  const cooldownLeft = cooling ? Math.ceil((cooldownUntil - realNow) / 1000) : 0;

  return (
    <section id="ping" className={s.section} aria-labelledby="ping-title">
      <div className={s.head}>
        <h2 id="ping-title" className={s.title}>
          Ping Voyager.
        </h2>
        <p className={s.intro}>
          Hit send and a ping leaves at the speed of light, the fastest anything can go. It passes the
          Moon in about a second. It still won&apos;t reach Voyager until tomorrow.
        </p>
      </div>

      <form
        className={s.composer}
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <label className={s.noteLabel} htmlFor="ping-note">
          Note to self (stays on this device)
        </label>
        <div className={s.composerRow}>
          <input
            id="ping-note"
            className={s.note}
            value={note}
            maxLength={MAX_NOTE_LENGTH}
            placeholder="hi from Miami"
            autoComplete="off"
            onChange={(e) => setNote(e.target.value)}
          />
          <button type="submit" className={s.send} disabled={!canSend}>
            {cooling ? `Sent. Next in ${cooldownLeft}s` : data ? "Send a ping" : "Loading trajectory…"}
          </button>
        </div>
      </form>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      <PingTrack
        className={s.track}
        frame={frameRef}
        label={`Track from Earth to Voyager 1 on a ${scale === "log" ? "logarithmic" : "true"} scale, showing your pings and everyone else's in flight.`}
      />

      <div className={s.controls}>
        <div className={s.group} role="group" aria-label="Scale">
          <span className={s.groupLabel}>Scale</span>
          <button type="button" className={s.toggle} aria-pressed={scale === "log"} onClick={() => setScale("log")}>
            Log
          </button>
          <button type="button" className={s.toggle} aria-pressed={scale === "true"} onClick={() => setScale("true")}>
            True
          </button>
        </div>
        <div className={s.group} role="group" aria-label="Speed">
          <span className={s.groupLabel}>Speed</span>
          {SPEEDS.map((sp) => (
            <button
              key={sp.factor}
              type="button"
              className={s.toggle}
              aria-pressed={warp.factor === sp.factor}
              onClick={() => setSpeed(sp.factor)}
            >
              {sp.label}
            </button>
          ))}
          {ahead > 1000 && (
            <button type="button" className={s.linkButton} onClick={() => setWarp(LIVE)}>
              Back to now
            </button>
          )}
        </div>
      </div>
      <p className={s.caption}>
        {scale === "log"
          ? "Log scale: each step to the right is ten times farther than the last."
          : "True scale: every planet fits in the first sixth of the line."}{" "}
        {ahead > 1000 ? `Showing ${formatDuration(ahead)} from now.` : "Showing right now."}
      </p>

      <div className={s.readouts}>
        <div className={s.status}>
          {latest && latestTimeline && simNow !== null ? (
            <LatestStatus ping={latest} t={latestTimeline} simNow={simNow} onShare={share} copied={copied} />
          ) : (
            <p className={s.muted}>
              Your pings show up here, with the exact moment each one reaches Voyager. The ping is
              pretend. The timing is real.
            </p>
          )}
        </div>
        <div className={s.global}>
          {summary ? (
            <p>
              Right now {formatNumber(summary.outbound, 0)} {summary.outbound === 1 ? "ping is" : "pings are"} on
              the way out and {formatNumber(summary.returning, 0)} on the way back.{" "}
              {formatNumber(summary.reached, 0)} {summary.reached === 1 ? "has" : "have"} reached Voyager so far.
            </p>
          ) : (
            <p className={s.muted}>Everyone&apos;s pings show up as small dots on the line.</p>
          )}
          <p className={s.fine}>
            Pings are anonymous. The counter keeps how many were sent each hour and nothing else. Your
            note never leaves this device.
          </p>
        </div>
      </div>

      {pings.length > 1 && (
        <ol className={s.list}>
          {pings.slice(1).map((p) => {
            const t = timelines.get(p.id);
            const pos = t && simNow !== null ? pingPosition(t, simNow) : null;
            return (
              <li key={p.id} className={s.item}>
                <span>Sent {shortMoment(p.sentAt)}</span>
                <span className={s.muted}>
                  {!pos || !t
                    ? "—"
                    : pos.phase === "outbound"
                      ? `${Math.floor((pos.km / ((C_KM_S * (t.arrivesAt - t.sentAt)) / 1000)) * 100)}% of the way out`
                      : pos.phase === "reply"
                        ? "Reply heading home"
                        : "Round trip done"}
                </span>
                {p.note && <span className={s.itemNote}>{p.note}</span>}
                <button type="button" className={s.linkButton} onClick={() => remove(p.id)}>
                  Remove
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function LatestStatus({
  ping,
  t,
  simNow,
  onShare,
  copied,
}: {
  ping: Ping;
  t: Timeline;
  simNow: number;
  onShare: () => void;
  copied: boolean;
}) {
  const pos = pingPosition(t, simNow);
  const tripKm = (C_KM_S * (t.arrivesAt - t.sentAt)) / 1000;
  const passed = pos.phase === "outbound" ? lastMilestonePassed(pos.km) : null;

  return (
    <>
      <p className={s.statusLabel}>
        Your latest ping{ping.note ? <>: &ldquo;{ping.note}&rdquo;</> : null}
      </p>
      {pos.phase === "outbound" && (
        <>
          <p className={s.statusValue}>{Math.floor((pos.km / tripKm) * 100)}% of the way there</p>
          <p>
            {passed ? `It's past ${passed.label}. ` : "Still leaving Earth. "}
            It reaches Voyager {shortMoment(t.arrivesAt)}, in {formatDuration(t.arrivesAt - simNow)}.
          </p>
        </>
      )}
      {pos.phase === "reply" && (
        <>
          <p className={s.statusValue}>Reached Voyager</p>
          <p>
            It got there {shortMoment(t.arrivesAt)}. If Voyager could answer, the reply would land{" "}
            {shortMoment(t.homeAt)}, in {formatDuration(t.homeAt - simNow)}.
          </p>
        </>
      )}
      {pos.phase === "home" && (
        <>
          <p className={s.statusValue}>Round trip: {formatHMS(t.homeAt - t.sentAt)}</p>
          <p>Out and back at the speed of light. That&apos;s the lag every command to Voyager lives with.</p>
        </>
      )}
      <button type="button" className={s.share} onClick={onShare}>
        {copied ? "Copied" : "Share"}
      </button>
    </>
  );
}
