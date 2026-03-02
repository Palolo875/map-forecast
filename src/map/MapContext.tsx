import { createContext, useContext, useMemo, useState } from "react";
import type maplibregl from "maplibre-gl";

type MapContextValue = {
  map: maplibregl.Map | null;
  setMap: (map: maplibregl.Map | null) => void;
};

const MapContext = createContext<MapContextValue | null>(null);

export function MapProvider({ children }: { children: React.ReactNode }) {
  const [map, setMap] = useState<maplibregl.Map | null>(null);

  const value = useMemo<MapContextValue>(() => ({ map, setMap }), [map]);

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

export function useMap() {
  const ctx = useContext(MapContext);
  if (!ctx) {
    throw new Error("useMap must be used within a MapProvider");
  }
  return ctx;
}
