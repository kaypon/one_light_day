import { AU_KM, MOON_KM } from "./constants";

export type Milestone = { id: string; label: string; short: string; km: number };

/**
 * Landmarks a ping passes on the way out, by distance from Earth. Planets
 * sit at their average distance from the Sun; the last two are where
 * Voyager 1 crossed the edge of the Sun's bubble (Dec 2004 and Aug 2012).
 */
export const MILESTONES: readonly Milestone[] = [
  { id: "moon", label: "the Moon", short: "Moon", km: MOON_KM },
  { id: "sun", label: "the Sun", short: "Sun", km: AU_KM },
  { id: "jupiter", label: "Jupiter's orbit", short: "Jupiter", km: 5.2 * AU_KM },
  { id: "saturn", label: "Saturn's orbit", short: "Saturn", km: 9.58 * AU_KM },
  { id: "uranus", label: "Uranus's orbit", short: "Uranus", km: 19.19 * AU_KM },
  { id: "neptune", label: "Neptune's orbit", short: "Neptune", km: 30.07 * AU_KM },
  { id: "pluto", label: "Pluto's orbit", short: "Pluto", km: 39.48 * AU_KM },
  { id: "shock", label: "the termination shock", short: "Termination shock", km: 94 * AU_KM },
  { id: "heliopause", label: "the heliopause", short: "Heliopause", km: 121.6 * AU_KM },
];
