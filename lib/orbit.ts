// A simple model of Earth's orbit, for the top-down "wobble" diagram. The
// chart itself uses JPL data; this only has to place Earth and its motion
// convincingly (tests hold it to the data within ~0.6 km/s).

/** Voyager 1's direction seen from the Sun (JPL Horizons, 2026–27; drifts < 0.1°/yr). */
export const VOYAGER_LON_DEG = 256.8;
export const VOYAGER_LAT_DEG = 35.16;

const EARTH_ORBIT_KM_S = 29.78;
const RAD = Math.PI / 180;
const J2000_MS = Date.UTC(2000, 0, 1, 12);

const mod360 = (deg: number) => ((deg % 360) + 360) % 360;

/** Earth's heliocentric ecliptic longitude, degrees. Low-precision solar formula (±0.01°). */
export function earthLongitudeDeg(ms: number): number {
  const d = (ms - J2000_MS) / 86_400_000;
  const meanLon = 280.46 + 0.9856474 * d;
  const g = (357.528 + 0.9856003 * d) * RAD;
  const sunLon = meanLon + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g);
  return mod360(sunLon + 180);
}

/**
 * How fast Earth's orbital motion carries it toward Voyager 1 (km/s;
 * negative means away). Earth moves 90° ahead of its longitude; only the
 * part along Voyager's direction (which sits 35° above the plane) counts.
 */
export function earthTowardVoyagerKmS(ms: number): number {
  const heading = (earthLongitudeDeg(ms) + 90) * RAD;
  return EARTH_ORBIT_KM_S * Math.cos(VOYAGER_LAT_DEG * RAD) * Math.cos(VOYAGER_LON_DEG * RAD - heading);
}
