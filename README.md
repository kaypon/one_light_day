# One Light-Day

A countdown to Voyager 1 becoming the first human-made object one light-day from Earth:
**Wednesday, Nov 18, 2026, 10:16:07 UTC** (2:16:07 a.m. PST, per NASA).

## What's on the page

- A clock showing how long light takes to reach Voyager 1 right now, ticking toward 24:00:00.
- A not-to-scale engineering drawing of the distance, with the one-light-day mark.
- How fast it's pulling away (and how much of that is Earth's orbit), the moment in your time
  zone, and a calendar file.
- How we know: where the numbers come from, and the three fair ways to count a light-day.

After the moment passes, the page flips to counting up on its own.

Preview any moment by adding `?now=2026-11-18T10:15:50Z` to the URL (optionally `&speed=60`).

## How it works

- **Trajectory:** [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/), target `-31`, geometric
  vectors from Earth's center. `npm run ephemeris` writes daily samples for 2026–2030 to
  `public/data/voyager1-daily.json`. The site never calls Horizons at runtime.
- **Interpolation:** cubic Hermite between daily samples, using range rate as the slope. Held-out
  6-hourly Horizons samples match within 47 m, and the data crosses one light-day 3 ms before
  NASA's published time. See `tests/ephemeris.test.ts`.
- **Stack:** Next.js 16 (static), React 19, plain CSS Modules, canvas halftone, Vitest.

## Development

```bash
npm install
git config core.hooksPath .githooks   # runs the secret check before every commit
npm run dev
npm test
npm run build
```

## Security

- No secrets in the browser or in git. `npm run check:secrets` fails if any value from a local
  `.env*` file appears in a tracked file or in the built output that browsers download. It prints
  file names only, never values.
- Security headers live in `next.config.ts`. `frame-ancestors` only allows this site and
  [kevdotnet](https://kevdotnet.vercel.app), whose project page embeds it.

## Credits

- Launch photo: NASA/JPL-Caltech/KSC ([PIA21747](https://photojournal.jpl.nasa.gov/catalog/PIA21747)).
- Data: NASA/JPL Horizons. An independent project, not affiliated with NASA or JPL.
- Fonts: Archivo Black (SIL OFL, `assets/ArchivoBlack-OFL.txt`), DejaVu Sans Mono
  (`app/fonts/DejaVu-LICENSE.txt`).
- Built by [Kevin van der Poll](https://kevdotnet.vercel.app).
