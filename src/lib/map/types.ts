/**
 * Map types — owned by `lib/map`, not by the listings domain: the map has no
 * reason to depend on the listings domain to name a pin, so the dependency is
 * inverted and the listings domain re-exports these for its consumers.
 */
/** The two coordinates a camera move needs — no place, no postings. */
export interface MapPoint {
  latitude: number;
  longitude: number;
}

export interface MapPlaceListing {
  id: string;
  title: string;
  dateRange: string;
  practiceName: string;
  city: string;
  location: { latitude: number; longitude: number };
}

export interface MapPlace {
  /** Stable key — the practice the read grouped under. */
  key: string;
  latitude: number;
  longitude: number;
  /** How many postings sit here, whatever the preview list holds. */
  count: number;
  listings: MapPlaceListing[];
}
