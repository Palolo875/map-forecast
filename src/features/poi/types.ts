export type PoiSource = "dataset" | "api";

export type PoiType = "refuge" | "emergency_shelter" | "weather_station" | "spot";

export type LatLng = {
  lat: number;
  lng: number;
};

export type Poi = {
  id: string;
  type: PoiType;
  source: PoiSource;
  name: string;
  position: LatLng;
  meta?: Record<string, unknown>;
};

export type IdealWeather = {
  tempMinC?: number;
  tempMaxC?: number;
  windMaxKmh?: number;
  precipitationMaxMm?: number;
  cloudCoverMaxPct?: number;
};

export type PoiNote = {
  id: string;
  poiId: string;
  createdAt: number;
  text: string;
  photoIds?: string[];
};

export type PoiVisit = {
  id: string;
  poiId: string;
  visitedAt: number;
  weatherSnapshot?: {
    temperatureC?: number;
    windSpeedKmh?: number;
    precipitationMm?: number;
    weatherCode?: number;
  };
};

export type PoiUserOverlay = {
  poiId: string;
  isFavorite?: boolean;
  idealWeather?: IdealWeather;
};

export type PoiUserState = {
  overlaysByPoiId: Record<string, PoiUserOverlay>;
  notesByPoiId: Record<string, PoiNote[]>;
  visitsByPoiId: Record<string, PoiVisit[]>;
};
