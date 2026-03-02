import { useState, useCallback, useRef } from "react";
import MapView from "@/components/MapView";
import SearchBar from "@/components/SearchBar";
import { HugeiconsIcon, SunCloud02Icon } from "@/components/icons";
import { POI_DATASET } from "@/features/poi/dataset";
import type { Poi } from "@/features/poi/types";
import { fetchRouteValhalla } from "@/features/route/valhalla";
import type { RouteResult } from "@/features/route/valhalla";
import { analyzeRouteWeather } from "@/features/route/analyze";
import type { RouteAnalysis } from "@/features/route/analyze";
import MapHub from "@/components/MapHub";

const Index = () => {
  const [flyTo, setFlyTo] = useState<{ lng: number; lat: number } | null>(null);
  const [weatherLocation, setWeatherLocation] = useState<{
    lat: number;
    lng: number;
    name: string;
  } | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);

  const [routeOrigin, setRouteOrigin] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [routeDestination, setRouteDestination] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [routeStatus, setRouteStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [routeError, setRouteError] = useState<string | undefined>(undefined);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeAnalysis, setRouteAnalysis] = useState<RouteAnalysis | null>(null);
  const [departureTs, setDepartureTs] = useState<number>(() => Date.now());
  const analysisTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMapClick = useCallback(async (lng: number, lat: number) => {
    let name = `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
    try {
      const res = await fetch(
        `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&lang=fr`
      );
      const data = await res.json();
      if (data.features?.length > 0) {
        const p = data.features[0].properties;
        name = [p.name, p.city, p.country].filter(Boolean).join(", ");
      }
    } catch {
      // keep coordinates as name
    }
    setWeatherLocation({ lat, lng, name });
    setRouteOrigin({ lat, lng, name });
  }, []);

  const handleSearchSelect = useCallback((lat: number, lng: number, name: string) => {
    setFlyTo({ lng, lat });
    setWeatherLocation({ lat, lng, name });

    const dest = { lat, lng, name };
    setRouteDestination(dest);

    if (!routeOrigin) {
      setRouteStatus("idle");
      setRoute(null);
      return;
    }

    setRouteStatus("loading");
    setRouteError(undefined);
    setRouteAnalysis(null);

    fetchRouteValhalla({
      origin: { lat: routeOrigin.lat, lng: routeOrigin.lng },
      destination: { lat: dest.lat, lng: dest.lng },
      profile: "auto",
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
        setRoute(null);
        setRouteAnalysis(null);
        setRouteStatus("error");
        setRouteError(e instanceof Error ? e.message : "ROUTE_ERROR");
      });
  }, [routeOrigin]);

  const clearRoute = useCallback(() => {
    setRouteOrigin(null);
    setRouteDestination(null);
    setRouteStatus("idle");
    setRouteError(undefined);
    setRoute(null);
    setRouteAnalysis(null);
  }, []);

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

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
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
      </div>

      {/* Weather Panel */}
      <div className="absolute bottom-5 right-5 z-20">
        <MapHub
          weatherLocation={weatherLocation}
          onClearWeather={() => setWeatherLocation(null)}
          selectedPoi={selectedPoi}
          onClearPoi={() => setSelectedPoi(null)}
          onRequestWeatherAt={(lat, lng, name) => setWeatherLocation({ lat, lng, name })}
          routeOriginLabel={routeOrigin?.name}
          routeDestinationLabel={routeDestination?.name}
          routeStatus={routeStatus}
          routeError={routeError}
          route={route}
          routeAnalysis={routeAnalysis}
          departureTs={departureTs}
          onDepartureTsChange={simulateDeparture}
          onClearRoute={clearRoute}
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
