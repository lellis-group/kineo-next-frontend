/**
 * Map types — owned by `lib/map`, not by the listings domain.
 *
 * The browse feed's `MapPlace` used to live in `browse-contracts.ts`, which
 * forced every module in `lib/map` to import from `@/lib/listings` just to name
 * a pin. Inverting the dependency: the map owns its own types, and the listings
 * domain re-exports them for its consumers.
 */
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
