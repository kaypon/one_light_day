# ONE LIGHT-DAY — Voyager 1 milestone microsite

## Context
On **Wed 2026-11-18 at 10:16:07 UTC** (NASA: "2:16:07 a.m. PST"; 5:16:07 a.m. EST in Florida) Voyager 1 becomes the first
human-made object one light-day (25,902,068,371 km / 173.14 AU) from Earth. Kevin wants a "dope little" Next.js site that
celebrates it with educational animation, a countdown and interactivity, listed on his portfolio (`../kevs_site`).
Today is 2026-10-05, so the deadline is 44 days out. Ship the clock first so it counts down for ~6 weeks, then add sections.
After the date it must keep working as a count-up/live tracker so it doesn't sit dead on the portfolio.

**Decisions (from Q&A):** Mission-document look · all four interactive pieces (Ping Voyager, The wobble, 49 years of lag,
live "who's listening") · global ping counter on **Upstash Redis Free plan** (Vercel Marketplace lists Free; 500K cmds/mo,
256 MB, no auto-charge) · standalone app in `voyager/` + entry in `kevs_site/lib/projects.ts`.

## Verified facts (drive copy + tests)
- JPL Horizons (target `-31`, center `500@399`, `VEC_CORR=NONE`, UT): geometric light-time crosses 86,400 s at 10:16:07 UTC Nov 18,
  which matches NASA to the second. EarthSky's "12:16:07 a.m. CST" is a TZ error.
- Three definitions (footnote): command uplink hits 24 h ≈ Nov 17 ~18:20 UTC · geometric (NASA, our countdown) Nov 18 10:16:07 UTC ·
  light we receive (down-leg) ≈ Nov 19 02:18 UTC.
- Today: 25,775,637,140 km, range rate +38.8 km/s, gap 126.4M km. Mid-Nov range rate ≈ 25.4 km/s (light-time +7.3 s/day).
- Distance **shrinks Jan 21 → Apr 24, 2027 by 40.66M km** (~106 Earth–Moon), min range rate −7.65 km/s on Mar 8. The trough stays
  26.6M km above one light-day, so there's a single crossing.
- Horizons covers Voyager 1 past 2040. NASA anchors: Moon 1.3 s, Sun 8 m 20 s, Neptune 4 h 10 m; Voyager 2 hits one light-day Nov 2035;
  Gliese 445 within ~1.7 ly in ~40,000 yr.
- DSN Now feed `https://eyes.nasa.gov/dsn/data/dsn.xml` is live with `Access-Control-Allow-Origin: *`; dishes → targets
  (`name`, `uplegRange`, `downlegRange`, `rtlt`) + up/down signals (`dataRate`, `band`). Voyager 1 = target `VGR1`.

## Architecture
- **Stack:** Next.js 16 App Router + TypeScript (create-next-app@latest, npm, no Tailwind; plain CSS Modules + tokens like kevs_site),
  React 19, Canvas 2D/SVG for animation (no 3D/animation libs), `@upstash/redis`, `@vercel/analytics`, Vitest.
  Read `node_modules/next/dist/docs` before writing Next-specific code (AGENTS.md rule: Next 16 has breaking changes).
- **Static page + 2 tiny API routes.** No runtime dependency on Horizons.

```
voyager/
  app/layout.tsx, page.tsx, globals.css, opengraph-image.tsx
  app/api/pings/route.ts      GET (CDN-cached 60s) / POST (throttled) → Upstash
  app/api/dsn/route.ts        fetch + parse DSN Now, CDN-cached 30s, no Redis
  components/{clock,ping,dsn,wobble,timeline}/…  + Halftone.tsx (canvas dot-screen renderer)
  lib/constants.ts  C, LIGHT_DAY_KM, MILESTONE_MS = Date.UTC(2026,10,18,10,16,7), LAUNCH_MS
  lib/ephemeris.ts  cubic Hermite on daily RG+RR → rangeKm(t), rangeRate(t), helioKm(t)
  lib/time.ts       useNow(): one shared rAF ticker via useSyncExternalStore (null server snapshot → no hydration
                    mismatch), pauses when hidden; ?now=<ISO>&speed=<n> override for previews/QA; formatters
  lib/pings.ts      pure: uplegSec = ρ/(c − v_helio_r), position(t), ETA/reply, hour-histogram → jittered dots, storage parse
  lib/dsn.ts        pure XML → typed snapshot; lib/redis.ts lazy getRedis()
  scripts/fetch-ephemeris.ts  Horizons → public/data/voyager1-daily.json (2026-01-01…2030-12-31, geo+helio RG/RR),
                              data/voyager1-monthly.json (1977-09…2030, light-time curve), data/events.json (TLIST at event dates)
  tests/  ephemeris, countdown, pings, dsn (+ fixtures/*.xml), api routes (mock Redis)
  docs/specs/2026-10-05-one-light-day-design.md   (copy of this plan)
```
- Daily JSON (~40 KB gz) is served from `public/data` with `<link rel=preload>`; Hermite error ≈ 30 m (linear would be ~4,400 km).
- **Global pings (Redis, anonymous, no content):** POST checks `Origin`, throttles per salted IP hash (`SET rl:<h> NX EX 20`),
  enforces a monthly cap (~60K pings) so it stays inside the free tier, then `INCR pings:h:<hour>` (+`EXPIRE` 50 h) + `INCR pings:total`.
  GET = one `MGET` (total + last 48 hour buckets) with `Cache-Control: s-maxage=60, stale-while-revalidate`. On any Redis
  error/limit the UI quietly falls back to local-only.

## Page spec (single scroll, mission-document style)
0. **Hero clock.** Doc header strip "VOYAGER 1 · FIELD NOTE 049 · 18.11.2026", T-minus DD:HH:MM:SS, "ONE LIGHT-DAY.",
   DISTANCE odometer (km/mi/AU toggle), SIGNAL one-way light-time `23h 59m 52.417381s`, GAP "126,431,231 km to go: 329 Moon trips",
   speed vs Earth, the moment in the visitor's local TZ, **SEND A PING** + **+ CALENDAR** (client-generated .ics), halftone Voyager.
   Must look good inside kevs_site's 16:10 / 3:4 iframe.
1. **Ping Voyager.** Fire a photon at true c along an Earth→Voyager track with milestones (Moon, Sun-distance, planets, Pluto,
   termination shock 94 AU, heliopause 121.6 AU, Voyager). Log/linear toggle (linear: every planet sits in the first 17%; at
   true scale light barely moves). Section-local sim clock with warp 1×/60×/3,600×/86,400× and a "LIVE" snap-back.
   Shows ETA at Voyager and the "reply" ETA (~48 h) in local time. Optional private note kept in localStorage only (never sent).
   Last ~20 pings persist. Everyone's pings render as anonymous dots (outbound 0–24 h, replies 24–48 h) with a
   "N in flight · M arrived" counter. Share via Web Share/copy.
2. **Who's listening.** Goldstone/Madrid/Canberra schematic; highlights the dish tracking VGR1 with live data rate (~160 bps) and
   DSN-measured RTLT vs our model. When idle: "nobody's on the line right now" plus who the dishes ARE talking to (friendly names
   from `config.xml`) with their light-times for contrast. Polls every 60 s; feed-down fallback.
   _Stretch:_ a Voyager photo "downloading" at true 160 bps.
3. **The wobble.** Top-down ecliptic diagram: drag Earth around its orbit (or keyboard date slider), Voyager arrow at λ≈256°/β≈+35°.
   Live distance, range rate and a tug-of-war bar (Voyager +16.9 km/s vs Earth's ±24.4 km/s). A linked chart of real distance Oct 2026→Dec 2027
   marks the one-light-day line, the Nov 18 crossing and the shaded spring dip.
4. **49 years of lag.** Scroll chapters with a sticky log-scale SIGNAL DELAY gauge that tweens per chapter (values from events.json):
   launch 1977, overtakes Voyager 2, Jupiter 1979, Saturn/Titan 1980 (why it's 35° above the plane, linking to §3), Pale Blue Dot 1990,
   most distant object 1998, termination shock 2004, heliopause 2012, thrusters revived 2017, 2023–24 FDS chip fix, one light-day 2026,
   then Voyager 2 in 2035 and Gliese 445. Every fact gets re-verified against NASA sources while writing.
5. **Footer / method.** How the time is computed, the three definitions, sources, image credits "NASA/JPL-Caltech",
   "Not affiliated with NASA or JPL", built-by link to kevdotnet.vercel.app.
- **After the milestone:** count-up "+DD:HH:MM:SS since one light-day", light-time > 24 h, "IT HAPPENED." print-stamp animation in the
  first 24 h. Ephemeris coverage ends 2030 → graceful "data needs refresh" (README: `npm run ephemeris`).

## Visual system
Reuse kevs_site tokens (`--paper #f2f2f0`, `--ink #191611`, `--muted #756b59`) plus one signal orange (darkened variant for small text,
contrast-checked). Archivo Black display (next/font, same as kevs_site), DejaVu Sans Mono for telemetry (copy woff2 from
`kevs_site/public/fonts`). Form-field rules, section codes ("SEC. 02 — PING"), crosshair marks, stamps, halftone NASA public-domain
imagery via `Halftone.tsx`. No NASA insignia. Motion: odometer rolls, photon trails, stamps. `prefers-reduced-motion` respected.
Copy voice: direct, a little bite, no corporate sludge, avoid three-part phrasing.

## kevs_site integration
- `kevs_site/lib/projects.ts`: new entry at the top (year 2026; list is manually sorted by year), slug `one-light-day`, name
  "One Light-Day", tags `["Space","Interactive"]`, category `["art","tech"]`, `href` = deployed URL. Leave `embeddable` unset so
  `/projects/[slug]` iframes it. Draft copy for Kevin to edit; optional `caseStudy` later.
- Optional paragraph in `components/NowEntries.tsx`. Sitemap picks up `/projects/one-light-day` automatically.

## Security (requirement: no keys or secrets exposed anywhere)
- **Only secrets in the whole project:** the Upstash URL/tokens injected by the Marketplace integration, plus a random `PING_SALT`.
  Horizons, DSN Now and Vercel Analytics need no keys.
- **Server-only:** secrets are read only inside `app/api/*` through `lib/redis.ts`, which has `import "server-only"`, so an
  accidental client import fails the build. Never `NEXT_PUBLIC_*`. GET uses the **read-only** token and POST the write token
  (least privilege). Env vars are marked Sensitive on Vercel.
- **Git:** `.env*` and `.vercel` stay gitignored (verified before the first commit), and staged files are reviewed.
  `npm run check:secrets` loads `.env.local`, searches git-tracked files + `.next/static` build output for the secret
  *values*, and prints only file names. It runs before every commit and deploy. Values are never echoed in the terminal
  (`vercel env ls` shows names only).
- **Tiny attack surface:** no logins, accounts or payments, and no user content shown to others. Ping POST carries no content;
  the private note never leaves localStorage. Redis keys come from server-side templates only.
- **Abuse:** Origin allowlist, per-IP throttle (salted hash, 20 s TTL, no raw IPs stored), monthly cap. The Free plan has no card
  on file, so abuse can't create a bill. Worst case, the counter pauses and falls back to local-only.
- **DSN proxy:** fixed upstream URL (no SSRF), 5 s timeout, size cap, whitelisted fields only. Feed text renders as React text;
  no `dangerouslySetInnerHTML` anywhere with external data. `?now`/`?speed` are parsed strictly and clamped.
- **Headers (`next.config.ts`):**
  - CSP: `default-src 'self'`, `connect-src 'self'`, `object-src 'none'`, `base-uri 'self'`, and
    `frame-ancestors 'self' https://kevdotnet.vercel.app`. The allowlist lives in one constant so the portfolio iframe keeps
    working; no `X-Frame-Options: DENY`. Use the static-page CSP variant from the Next 16 docs (nonces would force dynamic rendering).
  - `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` with camera, mic
    and geolocation off, and `poweredByHeader: false`.
- **Dependencies:** next, react, react-dom, @upstash/redis, @vercel/analytics; dev: typescript, eslint, vitest. Use the latest
  patched Next 16 / React 19.2.x and keep `npm audit` clean before deploy.
- **Vercel:** preview deployments stay behind Vercel Authentication (default); only production is public. A GitHub repo, if any,
  is private or verified secret-free before push.

## Build order
- **M0 setup (today):** suggest `npm i -g vercel@latest` (CLI 59.6.2 is stale). create-next-app in `voyager/`, git init,
  `vercel link` (new project `one-light-day`), `vercel integration add upstash/upstash-kv` choosing the **Free** plan,
  `vercel env pull`. Copy this plan to `docs/specs/`.
- **M1 clock live (target Fri Oct 9):** ephemeris script + data, TDD `lib/` math, hero clock + .ics, footer/method, OG image,
  Analytics, preview deploy → prod deploy, kevs_site entry (**ask before pushing kevs_site**, since push = portfolio prod deploy).
- **M2 Ping (Oct 16):** local pings/track/warp/toggle/note, then `/api/pings` + global dots/counter.
- **M3 Live DSN (Oct 21).** **M4 Wobble + 49 years (Oct 30).**
- **M5 polish (Nov 6, freeze Nov 13):** a11y, perf, mobile + iframe, post-milestone QA, copy pass with Kevin. Watch it live Nov 18 05:16 EST.
- Skills when implementing: vercel:nextjs (Next 16 APIs), frontend-design (visual pass), dataviz (wobble chart + gauge),
  test-driven-development (lib math), vercel:deploy, run / claude-in-chrome (browser checks).

## Verification
- `npm test` (Vitest):
  - Hermite matches held-out Horizons 6-hourly samples within 1 km.
  - Crossing from data = 2026-11-18T10:16:07Z ± 2 s.
  - Spring dip ≈ 40.66M km between Jan 21 and Apr 24.
  - Countdown formatting at the boundary and before/after it.
  - Ping uplink ≈ geometric + 4.9 s; reply ETA; corrupt-localStorage tolerance.
  - DSN fixtures with and without VGR1.
  - API: Origin check, 429 throttle, cap, Redis-down fallback.
- `npm run lint` and `npm run build` clean.
- Browser (dev server + claude-in-chrome):
  - Hero ticks with no hydration errors.
  - `?now=2026-11-18T10:15:50Z` rolls into celebration; `?now=2027-03-01` shows the after-state and a shrinking distance.
  - Ping survives a reload; warp works.
  - DSN panel renders.
  - Reduced-motion emulation; 375 px width.
- API: `curl` POST twice → second returns 429; GET shows `s-maxage` header.
- Security:
  - `npm run check:secrets` finds 0 hits in tracked files and `.next/static`.
  - POST with a foreign `Origin` returns 403.
  - `curl -I` on prod shows CSP, nosniff and `frame-ancestors` (kevdotnet allowed).
  - Browser Network/Sources tabs never show the Upstash host or token.
  - `npm audit` reports 0 high/critical.
- Embedding: kevs_site locally with the new entry → `/projects/one-light-day` iframe loads the deployed site (no frame-blocking headers).
- Lighthouse mobile ≥ 90 for performance and accessibility.

## Risks
- DSN Now is an unofficial feed → defensive parser, fixtures, fallback UI.
- Free-tier Redis → CDN-cached reads, throttle, monthly cap, local-only fallback.
- Image licensing → NASA public domain only, credited, no insignia; no long Sagan quotes (link instead).
- Deadline → each milestone ships independently; the clock alone is a complete site.
