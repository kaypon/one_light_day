import daily from "@/public/data/voyager1-daily.json";
import { MILESTONE_MS } from "@/lib/constants";
import { lightDayMoments, seriesFrom } from "@/lib/ephemeris";
import { PORTFOLIO_URL } from "@/lib/site";
import s from "./Method.module.css";

const utc = (ms: number, withSeconds = false) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: withSeconds ? "2-digit" : undefined,
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(ms) + " UTC";

// Computed at build time from the same data the clock runs on.
const moments = lightDayMoments(seriesFrom(daily, "geo"), seriesFrom(daily, "helio"));
const offsetMs = moments ? moments.geometric - MILESTONE_MS : null;

export function Method() {
  return (
    <section id="method" className={s.method} aria-labelledby="method-title">
      <h2 id="method-title" className={s.title}>
        How we know
      </h2>

      <div className={s.columns}>
        <div className={s.prose}>
          <p>
            NASA puts the moment at Wednesday, Nov 18, 2026, 10:16:07 UTC (2:16:07 a.m. Pacific). The
            numbers here come from{" "}
            <a href="https://ssd.jpl.nasa.gov/horizons/" rel="noopener noreferrer">
              JPL Horizons
            </a>
            , the Jet Propulsion Laboratory&apos;s public trajectory service: Voyager 1&apos;s position
            measured from Earth&apos;s center, sampled daily and interpolated in your browser.
            {offsetMs !== null &&
              ` That data crosses one light-day ${Math.abs(offsetMs)} ms ${offsetMs <= 0 ? "before" : "after"} NASA's time.`}
          </p>
          <p>
            A light-day is how far light goes in 24 hours: 25,902,068,371 km. But Voyager keeps moving
            while light is in flight, about 1.46 million km per day, so &ldquo;one light-day away&rdquo;
            has three fair answers.
          </p>
        </div>

        {moments && (
          <dl className={s.moments}>
            <div className={s.moment}>
              <dt>{utc(moments.uplinkSent)}</dt>
              <dd>After this, a command sent from Earth needs more than a day to catch it.</dd>
            </div>
            <div className={`${s.moment} ${s.primary}`}>
              <dt>{utc(MILESTONE_MS, true)}</dt>
              <dd>Earth and Voyager are exactly one light-day apart. NASA&apos;s moment, and this page&apos;s.</dd>
            </div>
            <div className={s.moment}>
              <dt>{utc(moments.downlinkReceived)}</dt>
              <dd>After this, light reaching Earth left Voyager more than a day earlier.</dd>
            </div>
          </dl>
        )}
      </div>

      <dl className={s.titleBlock}>
        <div className={`${s.tb} ${s.tbTitle}`}>
          <dt>Title</dt>
          <dd>One Light-Day</dd>
        </div>
        <div className={s.tb}>
          <dt>Subject</dt>
          <dd>Voyager 1, JPL target −31</dd>
        </div>
        <div className={s.tb}>
          <dt>Drawn by</dt>
          <dd>
            <a href={PORTFOLIO_URL}>Kevin van der Poll</a>
          </dd>
        </div>
        <div className={s.tb}>
          <dt>Data</dt>
          <dd>JPL Horizons, NASA</dd>
        </div>
        <div className={s.tb}>
          <dt>Scale</dt>
          <dd>Not to scale. Nothing would fit.</dd>
        </div>
        <div className={s.tb}>
          <dt>Photo</dt>
          <dd>NASA/JPL-Caltech/KSC</dd>
        </div>
      </dl>
      <p className={s.disclaimer}>An independent project. Not affiliated with NASA or JPL.</p>
    </section>
  );
}
