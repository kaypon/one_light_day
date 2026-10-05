/** Speed of light in vacuum, km/s (exact by definition of the metre). */
export const C_KM_S = 299_792.458;

export const SECONDS_PER_DAY = 86_400;

/** How far light travels in 24 hours: 25,902,068,371.2 km. */
export const LIGHT_DAY_KM = C_KM_S * SECONDS_PER_DAY;

export const AU_KM = 149_597_870.7;
export const KM_PER_MILE = 1.609344;

/** Mean Earth–Moon distance. */
export const MOON_KM = 384_400;

/** NASA: Voyager 1 is one light-day from Earth at 2:16:07 a.m. PST, Nov 18, 2026. */
export const MILESTONE_MS = Date.UTC(2026, 10, 18, 10, 16, 7);
