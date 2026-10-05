// Vercel sets VERCEL_PROJECT_PRODUCTION_URL at build time (no secret, just the domain).
export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const PORTFOLIO_URL = "https://kevdotnet.vercel.app";

export const SITE_TITLE = "One Light-Day";
export const SITE_DESCRIPTION =
  "Voyager 1 hits one light-day from Earth on Nov 18, 2026, the first thing we've built to get that far. A live clock and a light-speed ping, straight from JPL's trajectory data.";
