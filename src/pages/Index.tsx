import { useState, useCallback, useEffect, useRef } from "react";
import MapView from "@/components/MapView";
import SearchBar from "@/components/SearchBar";
import { HugeiconsIcon, SunCloud02Icon } from "@/components/icons";
import { computeSunTimes } from "@/map/sun";
import { POI_DATASET } from "@/features/poi/dataset";
import type { Poi } from "@/features/poi/types";
import type { RouteResult } from "@/features/route/valhalla";
import { analyzeRouteWeather } from "@/features/route/analyze";
import type { RouteAnalysis } from "@/features/route/analyze";
import type { RouteRequest } from "@/features/route/types";
import MapHub from "@/components/MapHub";
import MapLayerSelector from "@/components/MapLayerSelector";
import type { MapMode, MapTheme } from "@/components/MapLayerSelector";
import { createValhallaAdapter } from "@/features/route/providers/ValhallaAdapter";
import { routingErrorLabel, toRoutingError } from "@/features/route/providers/RoutingProvider";

type PhotonReverseFeature = {
  properties?: { name?: string; city?: string; country?: string };
};

type PhotonReverseResponse = {
  features?: PhotonReverseFeature[];
};

const PHOTON_BASE_URL = import.meta.env.VITE_PHOTON_BASE_URL ?? "https://photon.komoot.io";

const Index = () => {
  const routingProvider = useRef(createValhallaAdapter());

  const [flyTo, setFlyTo] = useState<{ lng: number; lat: number } | null>(null);
  const [weatherLocation, setWeatherLocation] = useState<{
    lat: number;
    lng: number;
    name: string;
  } | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);

  const [mapMode, setMapMode] = useState<MapMode>("road");
  const [mapTheme, setMapTheme] = useState<MapTheme>("cream");
  const [mapAutoDayNight, setMapAutoDayNight] = useState<boolean>(true);
  const [mapNauticalOverlay, setMapNauticalOverlay] = useState<boolean>(false);
  const [mapIsNightNow, setMapIsNightNow] = useState<boolean>(false);

  const [routeStops, setRouteStops] = useState<Array<{ lat: number; lng: number; name: string }>>([]);
  const [routeAddMode, setRouteAddMode] = useState<"start" | "via" | "end">("end");
  const [routeProfile, setRouteProfile] = useState<RouteRequest["profile"]>("auto");
  const [routeStatus, setRouteStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [routeError, setRouteError] = useState<string | undefined>(undefined);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeAnalysis, setRouteAnalysis] = useState<RouteAnalysis | null>(null);
  const [departureTs, setDepartureTs] = useState<number>(() => Date.now());
  const analysisTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Nautical mode: detect if we should show nautical units
  const isNauticalMode = mapMode === "nautical" || mapNauticalOverlay;

  const requestRoute = useCallback(
    (stops: Array<{ lat: number; lng: number; name: string }>, profile: RouteRequest["profile"]) => {
      if (stops.length < 2) {
        setRouteStatus("idle");
        setRouteError(undefined);
        setRoute(null);
        setRouteAnalysis(null);
        return;
      }

      const origin = { lat: stops[0]!.lat, lng: stops[0]!.lng };
      const destination = { lat: stops[1]!.lat, lng: stops[1]!.lng };
      const rest = stops.slice(2).map((s) => ({ lat: s.lat, lng: s.lng }));
      const latLngStops: RouteRequest["stops"] = [origin, destination, ...rest];

      setRouteStatus("loading");
      setRouteError(undefined);
      setRouteAnalysis(null);

      routingProvider.current
        .getRoute({
          stops: latLngStops,
          profile,
        })
        .then(async (r) => {
          setRoute(r);

          const baseDeparture = Date.now();
          setDepartureTs(baseDeparture);
          const analysis = await analyzeRouteWeather(r, baseDeparture, 12);
          setRouteAnalysis(analysis);
          setRouteStatus("ready");
        })
        .catch((e) => {
          const err = toRoutingError(e);
          setRoute(null);
          setRouteAnalysis(null);
          setRouteStatus("error");
          setRouteError(routingErrorLabel(err));
        });
    },
    [],
  );

  const updateStops = useCallback(
    (nextStops: Array<{ lat: number; lng: number; name: string }>) => {
      setRouteStops(nextStops);
      requestRoute(nextStops, routeProfile);
    },
    [requestRoute, routeProfile],
  );

  const applySelectionToStops = useCallback(
    (sel: { lat: number; lng: number; name: string }) => {
      if (routeAddMode === "via") {
        updateStops([...routeStops, sel]);
        return;
      }

      if (routeAddMode === "start") {
        if (routeStops.length === 0) {
          updateStops([sel]);
          return;
        }
        const next = [sel, ...routeStops.slice(1)];
        updateStops(next);
        return;
      }

      // end
      if (routeStops.length === 0) {
        updateStops([sel]);
        return;
      }
      if (routeStops.length === 1) {
        updateStops([routeStops[0]!, sel]);
        return;
      }
      const next = [...routeStops];
      next[next.length - 1] = sel;
      updateStops(next);
    },
    [routeAddMode, routeStops, updateStops],
  );

  const handleMapClick = useCallback(async (lng: number, lat: number) => {
    let name = `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
    try {
      const res = await fetch(
        `${PHOTON_BASE_URL}/reverse?lat=${lat}&lon=${lng}&lang=fr`,
      );
      if (!res.ok) throw new Error(`PHOTON_${res.status}`);
      const data = (await res.json()) as PhotonReverseResponse;
      const p = data.features?.[0]?.properties;
      if (p) {
        name = [p.name, p.city, p.country].filter(Boolean).join(", ");
      }
    } catch {
      void name;
    }
    setWeatherLocation({ lat, lng, name });

    applySelectionToStops({ lat, lng, name });
  }, [applySelectionToStops]);

  const handleSearchSelect = useCallback((lat: number, lng: number, name: string) => {
    setFlyTo({ lng, lat });
    setWeatherLocation({ lat, lng, name });

    applySelectionToStops({ lat, lng, name });
  }, [applySelectionToStops]);

  const onRouteProfileChange = useCallback(
    (next: RouteRequest["profile"]) => {
      setRouteProfile(next);
      requestRoute(routeStops, next);
    },
    [requestRoute, routeStops],
  );

  const clearRoute = useCallback(() => {
    setRouteStops([]);
    setRouteStatus("idle");
    setRouteError(undefined);
    setRoute(null);
    setRouteAnalysis(null);
  }, []);

  const removeRouteStop = useCallback(
    (index: number) => {
      const next = routeStops.filter((_, i) => i !== index);
      updateStops(next);
    },
    [routeStops, updateStops],
  );

  const moveRouteStop = useCallback(
    (index: number, dir: -1 | 1) => {
      const nextIndex = index + dir;
      if (nextIndex < 0 || nextIndex >= routeStops.length) return;
      const next = [...routeStops];
      const tmp = next[index];
      next[index] = next[nextIndex]!;
      next[nextIndex] = tmp!;
      updateStops(next);
    },
    [routeStops, updateStops],
  );

  const simulateDeparture = useCallback(
    (nextDepartureTs: number) => {
      if (!route) {
        setDepartureTs(nextDepartureTs);
        return;
      }

      setDepartureTs(nextDepartureTs);
      if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current);

      analysisTimerRef.current = setTimeout(() => {
        setRouteStatus("loading");
        analyzeRouteWeather(route, nextDepartureTs, 12)
          .then((analysis) => {
            setRouteAnalysis(analysis);
            setRouteStatus("ready");
          })
          .catch((e) => {
            setRouteAnalysis(null);
            setRouteStatus("error");
            setRouteError(e instanceof Error ? e.message : "ROUTE_ANALYSIS_ERROR");
          });
      }, 250);
    },
    [route]
  );

  const handlePoiSelect = useCallback((poi: Poi) => {
    setSelectedPoi(poi);
    setFlyTo({ lng: poi.position.lng, lat: poi.position.lat });
  }, []);

  const dayNightRef = useCallback(() => {
    if (weatherLocation) return { lat: weatherLocation.lat, lng: weatherLocation.lng };
    if (routeStops.length > 0) return { lat: routeStops[0]!.lat, lng: routeStops[0]!.lng };
    if (flyTo) return { lat: flyTo.lat, lng: flyTo.lng };
    return { lat: 48.85, lng: 2.35 };
  }, [flyTo, routeStops, weatherLocation]);

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

  return (
    <div className={`relative h-screen w-screen overflow-hidden bg-background ${mapTheme === 'high-contrast' ? 'high-contrast-mode' : ''}`}>
      {/* Map */}
      <MapView
        onMapClick={handleMapClick}
        flyTo={flyTo}
        pois={POI_DATASET}
        onPoiSelect={handlePoiSelect}
        selectedPoiId={selectedPoi?.id ?? null}
        routeLine={route?.line ?? null}
        routeSegments={routeAnalysis?.segments ?? null}
        fitToRoute={routeStatus === "ready"}
        mapMode={mapMode}
        mapTheme={mapTheme}
        isNight={mapIsNightNow}
        nauticalOverlay={mapNauticalOverlay || mapMode === "nautical"}
      />

      {/* Top overlay */}
      <div className="absolute top-5 left-5 right-5 z-10 flex items-start gap-3">
        {/* Logo */}
        <div className="float-card-sm flex items-center gap-2.5 px-4 py-3 shrink-0">
          <HugeiconsIcon icon={SunCloud02Icon} size={20} className="text-primary" strokeWidth={1.5} />
          <span className="text-[15px] font-semibold text-foreground">
            NavéoMap
          </span>
        </div>

        {/* Search */}
        <SearchBar onSelect={handleSearchSelect} />

        {/* Map Layer Selector — single button opening popover */}
        <MapLayerSelector
          mapMode={mapMode}
          onMapModeChange={setMapMode}
          mapTheme={mapTheme}
          onMapThemeChange={setMapTheme}
          autoDayNight={mapAutoDayNight}
          onAutoDayNightChange={setMapAutoDayNight}
          nauticalOverlay={mapNauticalOverlay}
          onNauticalOverlayChange={setMapNauticalOverlay}
          isNight={mapIsNightNow}
        />

        {/* Nautical unit indicator */}
        {isNauticalMode && (
          <div className="float-card-sm px-3 py-2 flex items-center gap-2 text-[11px] text-primary font-medium animate-fade-in shrink-0">
            <span>🧭</span>
            <span>kt · nm</span>
          </div>
        )}
      </div>

      {/* Weather Panel */}
      <div className="absolute bottom-5 right-5 z-20">
        <MapHub
          weatherLocation={weatherLocation}
          onClearWeather={() => setWeatherLocation(null)}
          selectedPoi={selectedPoi}
          onClearPoi={() => setSelectedPoi(null)}
          onRequestWeatherAt={(lat, lng, name) => setWeatherLocation({ lat, lng, name })}
          routeStops={routeStops.map((s) => ({ name: s.name }))}
          onRemoveRouteStop={removeRouteStop}
          onMoveRouteStop={moveRouteStop}
          routeAddMode={routeAddMode}
          onRouteAddModeChange={setRouteAddMode}
          routeProfile={routeProfile}
          onRouteProfileChange={onRouteProfileChange}
          routeStatus={routeStatus}
          routeError={routeError}
          route={route}
          routeAnalysis={routeAnalysis}
          departureTs={departureTs}
          onDepartureTsChange={simulateDeparture}
          onClearRoute={clearRoute}
          useNauticalUnits={isNauticalMode}
        />
      </div>

      {/* Hint when no location selected */}
      {!weatherLocation && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 animate-fade-in">
          <div className="float-card-sm px-5 py-3 text-[13px] text-muted-foreground">
            Cliquez sur la carte ou recherchez un lieu pour voir la météo
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
