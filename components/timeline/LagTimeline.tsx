import events from "@/data/events.json";
import monthly from "@/data/voyager1-monthly.json";
import { C_KM_S } from "@/lib/constants";
import { LagTimelineView, type Chapter } from "./LagTimelineView";

// Copy for each chapter. Dates and distances come from data/events.json (JPL Horizons).
const COPY: Record<string, { when: string; text: string }> = {
  launch: {
    when: "Sept 5, 1977",
    text: "Liftoff from Florida. By the next morning it's as far away as the Moon.",
  },
  overtakes: {
    when: "Dec 15, 1977",
    text: "Passes its twin. Voyager 2 launched 16 days earlier but took the slower road.",
  },
  jupiter: {
    when: "Mar 5, 1979",
    text: "Jupiter. Its cameras catch volcanoes erupting on the moon Io, the first active ones ever seen beyond Earth.",
  },
  saturn: {
    when: "Nov 12, 1980",
    text: "Saturn, and a close pass by its moon Titan that bends Voyager north, out of the flat plane the planets orbit in. It never comes back.",
  },
  "pale-blue-dot": {
    when: "Feb 14, 1990",
    text: "It turns around for one last look and photographs Earth from 6 billion km: a pale blue dot. Then the cameras are switched off for good.",
  },
  farthest: {
    when: "Feb 17, 1998",
    text: "Passes Pioneer 10 to become the most distant thing people have ever made. It still is.",
  },
  "termination-shock": {
    when: "Dec 16, 2004",
    text: "Crosses the termination shock, where the solar wind drops from supersonic to subsonic.",
  },
  heliopause: {
    when: "Aug 25, 2012",
    text: "Leaves the Sun's bubble entirely. The first human-made object in interstellar space.",
  },
  thrusters: {
    when: "Nov 28, 2017",
    text: "Fires a set of thrusters that hadn't been used in 37 years. They work.",
  },
  glitch: {
    when: "Nov 14, 2023",
    text: "Starts sending gibberish. One memory chip in a 1970s computer has failed.",
  },
  fixed: {
    when: "Apr 20, 2024",
    text: "Back. Engineers moved its code around the dead chip from 15 billion miles away, waiting about 45 hours for every answer.",
  },
  "light-day": {
    when: "Nov 18, 2026",
    text: "One light-day. Nothing we've built has been this far from home.",
  },
  "voyager-2": {
    when: "Nov 2035",
    text: "Voyager 2 reaches one light-day. Voyager 1 is past 28 light-hours by then, if its power holds out.",
  },
};

const YEAR_SEC = 365.25 * 86_400;
// ~40,000 years at ~17 km/s, per NASA's estimate of the Gliese 445 flyby.
const GLIESE_DELAY_SEC = (40_000 * YEAR_SEC * 17.0) / C_KM_S;

export function LagTimeline() {
  const chapters: Chapter[] = events.events.map((e) => ({
    id: e.id,
    when: COPY[e.id].when,
    text: COPY[e.id].text,
    ms: e.ms,
    delaySec: e.geoKm / C_KM_S,
    plotted: e.ms <= monthly.ms[monthly.ms.length - 1],
  }));
  chapters.push({
    id: "gliese",
    when: "About 40,000 years from now",
    text: "It drifts within 1.7 light-years of a star called Gliese 445. A hello from Earth would take over two years to reach it.",
    ms: null,
    delaySec: GLIESE_DELAY_SEC,
    plotted: false,
  });

  const curve = monthly.ms.map((ms, i) => ({ ms, hours: monthly.rangeKm[i] / C_KM_S / 3600 }));

  return <LagTimelineView chapters={chapters} curve={curve} />;
}
