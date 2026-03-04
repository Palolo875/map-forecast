import * as React from "react";
import type { Poi } from "@/features/poi/types";
import type { RouteResult } from "@/features/route/valhalla";
import type { RouteAnalysis } from "@/features/route/analyze";
import type { HubTab } from "@/components/maphub/shared";

export type HubWeatherLocation = {
  lat: number;
  lng: number;
  name: string;
};

export type MiniWeather =
  | { status: "idle" | "loading" | "ready" | "error"; temperature?: number; windKmh?: number; precipitationMm?: number; code?: number }
  | null;

export type MapHubContextValue = {
  tab: HubTab;
  setTab: (next: HubTab) => void;
  ctx: { hasWeather: boolean; hasRoute: boolean; hasPoi: boolean };

  weatherLocation: HubWeatherLocation | null;
  onClearWeather: () => void;
  miniWeather: MiniWeather;

  selectedPoi: Poi | null;
  poiIsFavorite: boolean;
  onClearPoi: () => void;
  onRequestWeatherAt: (lat: number, lng: number, name: string) => void;

  routeStops: Array<{ name: string }>;
  onRemoveRouteStop: (index: number) => void;
  onMoveRouteStop: (index: number, dir: -1 | 1) => void;

  routeAddMode: "start" | "via" | "end";
  onRouteAddModeChange: (next: "start" | "via" | "end") => void;

  routeProfile: "auto" | "bicycle" | "pedestrian";
  onRouteProfileChange: (next: "auto" | "bicycle" | "pedestrian") => void;

  routeStatus: "idle" | "loading" | "error" | "ready";
  routeError?: string;
  route: RouteResult | null;
  routeAnalysis: RouteAnalysis | null;
  departureTs: number;
  onDepartureTsChange: (nextDepartureTs: number) => void;
  onClearRoute: () => void;

  navStepIndex: number;
  setNavStepIndex: (next: number) => void;

  useNauticalUnits?: boolean;

  routeBadge: { variant: "default" | "secondary" | "destructive"; label: string } | null;
  overviewRouteSubtitle: string;
  routeAlertsPreview: Array<{ index: number; ts: number; score: number; reason: string }>;
};

const MapHubContext = React.createContext<MapHubContextValue | null>(null);

export function MapHubProvider({ value, children }: { value: MapHubContextValue; children: React.ReactNode }) {
  return <MapHubContext.Provider value={value}>{children}</MapHubContext.Provider>;
}

export function useMapHub() {
  const ctx = React.useContext(MapHubContext);
  if (!ctx) throw new Error("useMapHub must be used within MapHubProvider");
  return ctx;
}
