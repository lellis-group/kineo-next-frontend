/**
 * Where the browse map opens. The member's own city when the profile has
 * one; else the country the browser's time zone places them in — a closer
 * proxy for where someone is than the interface language, and it tells the
 * overseas departments apart; else mainland France.
 */

export interface MapRegion {
  /** Longitude first, as MapLibre takes it. */
  center: [number, number];
  zoom: number;
}

/** Mainland France, whole. */
export const FRANCE: MapRegion = { center: [2.35, 46.6], zoom: 5.2 };

/** Around one city: the city and the towns a replacement could reach. */
const CITY_ZOOM = 9;

/**
 * The time zones of France and its neighbours, each to the region it means.
 * A zone missing here falls back to mainland France: the console serves
 * French practitioners.
 */
const TIME_ZONE_REGIONS: Readonly<Record<string, MapRegion>> = {
  "Europe/Paris": FRANCE,
  "Europe/Monaco": { center: [7.42, 43.74], zoom: 11 },
  "Europe/Brussels": { center: [4.47, 50.5], zoom: 7 },
  "Europe/Luxembourg": { center: [6.13, 49.8], zoom: 9 },
  "Europe/Zurich": { center: [8.23, 46.8], zoom: 7 },
  "America/Guadeloupe": { center: [-61.55, 16.25], zoom: 9 },
  "America/Martinique": { center: [-61.02, 14.64], zoom: 9.5 },
  "America/St_Barthelemy": { center: [-62.83, 17.9], zoom: 11 },
  "America/Marigot": { center: [-63.06, 18.07], zoom: 11 },
  "America/Cayenne": { center: [-53.1, 4.0], zoom: 6.5 },
  "America/Miquelon": { center: [-56.32, 46.95], zoom: 9.5 },
  "Indian/Reunion": { center: [55.53, -21.13], zoom: 9.5 },
  "Indian/Mayotte": { center: [45.15, -12.82], zoom: 10 },
  "Pacific/Noumea": { center: [165.6, -21.3], zoom: 7 },
  "Pacific/Tahiti": { center: [-149.5, -17.6], zoom: 9 },
  "Pacific/Wallis": { center: [-176.2, -13.28], zoom: 10 },
};

export function homeRegion({
  coordinates,
  timeZone,
}: {
  /** The profile's geocoded city, when there is one. */
  coordinates?: { latitude: number; longitude: number } | null;
  /** The browser's IANA zone, e.g. `Europe/Paris`. */
  timeZone?: string;
}): MapRegion {
  if (coordinates) {
    return {
      center: [coordinates.longitude, coordinates.latitude],
      zoom: CITY_ZOOM,
    };
  }
  return (timeZone && TIME_ZONE_REGIONS[timeZone]) || FRANCE;
}

/** The browser's time zone, or undefined where `Intl` can't say. */
export function browserTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}
