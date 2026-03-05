export type PoiSource = "dataset" | "api" | "user";

export type PoiType = "refuge" | "emergency_shelter" | "weather_station" | "spot" | "note";

export type LatLng = {
  lat: number;
  lng: number;
};

export type CurrentWeatherSnapshot = {
  temperatureC: number;
  windSpeedKmh: number;
  windDirectionDeg?: number;
  precipitationMm?: number;
  weatherCode?: number;
  cloudCoverPct?: number;
};

export type WeatherSnapshot = Partial<CurrentWeatherSnapshot>;

export type Poi = {
  id: string;
  type: PoiType;
  source: PoiSource;
  name: string;
  position: LatLng;
  meta?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
};

export type IdealWeather = {
  tempMinC?: number;
  tempMaxC?: number;
  windMaxKmh?: number;
  windDirectionDeg?: number[];
  precipitationMaxMm?: number;
  cloudCoverMaxPct?: number;
};

export type PoiNote = {
  id: string;
  poiId: string;
  createdAt: number;
  text: string;
  photoBlob?: Blob; // Store image data directly for offline
  weatherSnapshot?: WeatherSnapshot;
  synced: boolean;
  syncedFlag: 0 | 1;
};

export type PoiVisit = {
  id: string;
  poiId: string;
  visitedAt: number;
  weatherSnapshot?: WeatherSnapshot;
};

export type PoiUserOverlay = {
  poiId: string;
  isFavorite?: boolean;
  idealWeather?: IdealWeather;
  customName?: string;
};

export type PoiUserState = {
  overlaysByPoiId: Record<string, PoiUserOverlay>;
  notesByPoiId: Record<string, PoiNote[]>;
  visitsByPoiId: Record<string, PoiVisit[]>;
};
