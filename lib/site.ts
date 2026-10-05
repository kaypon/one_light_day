// Vercel sets VERCEL_PROJECT_PRODUCTION_URL at build time (no secret, just the domain).
export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const PORTFOLIO_URL = "https://kevdotnet.vercel.app";

export const SITE_TITLE = "One Light-Day";
export const SITE_DESCRIPTION =
  "On Nov 18, 2026, Voyager 1 becomes the first thing we've built to sit a full day of light away from Earth. A live countdown, straight from JPL's trajectory data.";
