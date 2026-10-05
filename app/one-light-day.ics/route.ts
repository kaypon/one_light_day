import { MILESTONE_MS } from "@/lib/constants";
import { buildIcs } from "@/lib/ics";
import { SITE_URL } from "@/lib/site";

// Built once at deploy time; served as a plain file.
export const dynamic = "force-static";

export function GET() {
  const ics = buildIcs({
    uid: "voyager1-one-light-day@one-light-day",
    startMs: MILESTONE_MS,
    durationMin: 15,
    title: "Voyager 1 reaches one light-day from Earth",
    description: `The first thing we've built to get a full day of light away. Watch the clock hit 24:00:00: ${SITE_URL}`,
    url: SITE_URL,
    stampMs: Date.UTC(2026, 9, 5),
  });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="voyager-1-one-light-day.ics"',
    },
  });
}
