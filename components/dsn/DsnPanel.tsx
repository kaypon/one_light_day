"use client";

import type { DsnLink, DsnSummary } from "@/lib/dsn";
import { formatDataRate, formatHMS, formatLightDistance } from "@/lib/format";
import { pingTimeline } from "@/lib/pings";
import { useEphemeris } from "@/lib/useEphemeris";
import { useNow } from "@/lib/useNow";
import { usePolledJson } from "@/lib/usePolledJson";
import s from "./DsnPanel.module.css";

type DsnResponse = DsnSummary & { fetchedAt: number };

function isDsnResponse(data: unknown): data is DsnResponse {
  const d = data as DsnResponse | null;
  return typeof d?.fetchedAt === "number" && Array.isArray(d.stations);
}

export function DsnPanel() {
  const { data: dsn, failed } = usePolledJson("/api/dsn", isDsnResponse, 60_000);
  const now = useNow(1_000);
  const { data: eph } = useEphemeris();

  const voyager = dsn?.voyager1 ?? null;
  const ours = now !== null && eph ? pingTimeline(now, eph) : null;
  const spacecraftCount = dsn ? new Set(dsn.stations.flatMap((st) => st.links.map((l) => l.code))).size : 0;

  return (
    <section id="dsn" className={s.section} aria-labelledby="dsn-title">
      <div className={s.head}>
        <h2 id="dsn-title" className={s.title}>
          Who&apos;s listening.
        </h2>
        <p className={s.intro}>
          Everything Voyager sends home lands in NASA&apos;s Deep Space Network: three dish complexes
          spread about a third of the way around the world from each other, so one of them can always see
          deep space as Earth turns. This is what they&apos;re doing right now.
        </p>
      </div>

      <div className={s.voyager} aria-live="polite">
        {!dsn && !failed && <p className={s.muted}>Checking the dishes…</p>}
        {!dsn && failed && (
          <p className={s.muted}>NASA&apos;s live feed isn&apos;t answering right now. Try again in a few minutes.</p>
        )}
        {dsn && voyager && <OnTheLine link={voyager} ourRoundTripMs={ours ? ours.homeAt - ours.sentAt : null} />}
        {dsn && !voyager && (
          <>
            <p className={s.headline}>Nobody&apos;s on the line with Voyager 1 right now.</p>
            <p>
              It shares these dishes with {spacecraftCount > 0 ? `the ${spacecraftCount} missions below and ` : ""}
              dozens of others. Check back later and you might catch it.
            </p>
          </>
        )}
      </div>

      {dsn && (
        <div className={s.stations}>
          {dsn.stations.map((station) => (
            <div key={station.name} className={s.station}>
              <h3 className={s.stationName}>{station.name}</h3>
              {station.links.length === 0 ? (
                <p className={s.muted}>No spacecraft right now.</p>
              ) : (
                <ul className={s.links}>
                  {station.links.map((link, i) => (
                    <li key={`${link.dish}-${link.code}-${i}`} className={link.code === "VGR1" ? s.highlight : s.link}>
                      <span className={s.linkName}>{link.name}</span>
                      <span className={s.linkMeta}>
                        {link.dish}
                        {link.size ? `, ${link.size}` : ""}
                        {link.receiving && link.downBps ? `, ${formatDataRate(link.downBps)}` : ""}
                      </span>
                      {link.rangeKm !== null && <span className={s.linkMeta}>{formatLightDistance(link.rangeKm)} away</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      <p className={s.fine}>
        Live from NASA&apos;s{" "}
        <a href="https://eyes.nasa.gov/dsn/dsn.html" rel="noopener noreferrer">
          DSN Now
        </a>{" "}
        feed, checked every minute.
      </p>
    </section>
  );
}

function OnTheLine({ link, ourRoundTripMs }: { link: DsnLink; ourRoundTripMs: number | null }) {
  return (
    <>
      <p className={s.headline}>Voyager 1 is on the line.</p>
      <p>
        {link.dish}
        {link.size ? `, a ${link.size} dish` : ""} in {link.station}, is{" "}
        {link.receiving && link.downBps
          ? `pulling in its signal at ${formatDataRate(link.downBps)}.`
          : "pointed at it."}
      </p>
      {link.rtltSec !== null && (
        <p className={s.compare}>
          Round trip, by the DSN: {formatHMS(link.rtltSec * 1000)}
          {ourRoundTripMs !== null && (
            <>
              <br />
              Round trip, by this page, for a signal sent now: {formatHMS(ourRoundTripMs)}
            </>
          )}
        </p>
      )}
    </>
  );
}
