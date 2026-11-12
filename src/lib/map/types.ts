/** Map types, owned by `lib/map`; the listings domain re-exports them. */
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
