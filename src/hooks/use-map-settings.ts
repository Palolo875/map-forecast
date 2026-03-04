import { useCallback, useEffect, useState } from "react";
import type { MapMode, MapTheme } from "@/components/MapLayerSelector";
import { computeSunTimes } from "@/map/sun";

type RefLocation = { lat: number; lng: number } | null;

export type MapSettingsState = {
  mapMode: MapMode;
  mapTheme: MapTheme;
  mapAutoDayNight: boolean;
  mapNauticalOverlay: boolean;
  mapIsNightNow: boolean;
  isNauticalMode: boolean;
  setMapMode: (mode: MapMode) => void;
  setMapTheme: (theme: MapTheme) => void;
  setMapAutoDayNight: (v: boolean) => void;
  setMapNauticalOverlay: (v: boolean) => void;
};

export function useMapSettings(resolveRefLocation: () => RefLocation): MapSettingsState {
  const [mapMode, setMapMode] = useState<MapMode>("road");
  const [mapTheme, setMapTheme] = useState<MapTheme>("cream");
  const [mapAutoDayNight, setMapAutoDayNight] = useState<boolean>(true);
  const [mapNauticalOverlay, setMapNauticalOverlay] = useState<boolean>(false);
  const [mapIsNightNow, setMapIsNightNow] = useState<boolean>(false);

  const isNauticalMode = mapMode === "nautical" || mapNauticalOverlay;

  const dayNightRef = useCallback(() => {
    return resolveRefLocation() ?? { lat: 48.85, lng: 2.35 };
  }, [resolveRefLocation]);

  useEffect(() => {
    let cancelled = false;

    const tick = () => {
      if (!mapAutoDayNight) {
        if (!cancelled) setMapIsNightNow(false);
        return;
      }

      const ref = dayNightRef();
      const now = new Date();
      const { sunrise, sunset } = computeSunTimes(now, ref.lat, ref.lng);
      const isNight = now.getTime() < sunrise.getTime() || now.getTime() > sunset.getTime();
      if (!cancelled) setMapIsNightNow(isNight);
    };

    tick();
    const id = window.setInterval(tick, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [dayNightRef, mapAutoDayNight]);

  return {
    mapMode,
    mapTheme,
    mapAutoDayNight,
    mapNauticalOverlay,
    mapIsNightNow,
    isNauticalMode,
    setMapMode,
    setMapTheme,
    setMapAutoDayNight,
    setMapNauticalOverlay,
  };
}
