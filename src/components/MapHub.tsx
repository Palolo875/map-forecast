import { useEffect, useMemo, useState } from "react";
import type { Poi } from "@/features/poi/types";
import type { RouteResult } from "@/features/route/valhalla";
import type { RouteAnalysis } from "@/features/route/analyze";
import { loadPoiUserState } from "@/features/poi/storage";
import ResponsiveInspector from "@/components/ResponsiveInspector";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMiniWeather } from "@/hooks/use-mini-weather";
import OverviewTab from "@/components/maphub/OverviewTab";
import WeatherTab from "@/components/maphub/WeatherTab";
import RouteTab from "@/components/maphub/RouteTab";
import PoiTab from "@/components/maphub/PoiTab";
import { clampTab, HubButton, HubTab } from "@/components/maphub/shared";

export type HubWeatherLocation = {
  lat: number;
  lng: number;
  name: string;
};

type MapHubProps = {
  weatherLocation: HubWeatherLocation | null;
  onClearWeather: () => void;

  selectedPoi: Poi | null;
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
  useNauticalUnits?: boolean;
};

export default function MapHub({
  weatherLocation,
  onClearWeather,
  selectedPoi,
  onClearPoi,
  onRequestWeatherAt,
  routeStops,
  onRemoveRouteStop,
  onMoveRouteStop,
  routeAddMode,
  onRouteAddModeChange,
  routeProfile,
  onRouteProfileChange,
  routeStatus,
  routeError,
  route,
  routeAnalysis,
  departureTs,
  onDepartureTsChange,
  onClearRoute,
  useNauticalUnits,
}: MapHubProps) {
  const isMobile = useIsMobile();
  const ctx = useMemo(
    () => ({ hasWeather: !!weatherLocation, hasRoute: routeStops.length > 0, hasPoi: !!selectedPoi }),
    [routeStops.length, selectedPoi, weatherLocation],
  );

  const [tab, setTab] = useState<HubTab>("overview");

  const [navStepIndex, setNavStepIndex] = useState<number>(0);

  const [poiIsFavorite, setPoiIsFavorite] = useState<boolean>(false);

  const miniWeather = useMiniWeather(weatherLocation ? { lat: weatherLocation.lat, lng: weatherLocation.lng } : null);

  useEffect(() => {
    setTab((t) => clampTab(t, ctx));
  }, [ctx]);

  useEffect(() => {
    if (!selectedPoi) {
      setPoiIsFavorite(false);
      return;
    }
    const state = loadPoiUserState();
    setPoiIsFavorite(!!state.overlaysByPoiId[selectedPoi.id]?.isFavorite);
  }, [selectedPoi]);

  const title = useMemo(() => {
    if (tab === "weather" && weatherLocation?.name) return weatherLocation.name;
    if (tab === "poi" && selectedPoi?.name) return selectedPoi.name;
    if (tab === "route") {
      const first = routeStops[0];
      const last = routeStops[routeStops.length - 1];
      if (routeStops.length >= 2 && first && last) return `${first.name} → ${last.name}`;
      if (routeStops.length === 1 && first) return `Départ: ${first.name}`;
      return "Trajet";
    }

    if (selectedPoi?.name) return selectedPoi.name;
    const last = routeStops[routeStops.length - 1];
    if (routeStops.length >= 2 && last) return `Trajet vers ${last.name}`;
    if (weatherLocation?.name) return weatherLocation.name;
    return "Hub";
  }, [routeStops, selectedPoi?.name, tab, weatherLocation?.name]);

  const routeAlertsPreview = useMemo(() => {
    const samples = routeAnalysis?.samples ?? [];
    if (!samples.length) return [];

    const alerts = samples
      .filter((s) => s.risk.level === "high" || s.risk.level === "extreme")
      .map((s) => {
        const rain = s.weather.precipitationMm ?? 0;
        const wind = s.weather.windSpeedKmh ?? 0;
        const code = s.weather.weatherCode ?? 0;
        const reasons: string[] = [];
        if (code >= 95) reasons.push("orage");
        if (rain >= 3) reasons.push("pluie");
        if (wind >= 60) reasons.push("vent");
        const reason = reasons.length ? reasons.join(" · ") : "risque";
        return { index: s.index, ts: s.etaTs, score: s.risk.score, reason };
      });

    alerts.sort((a, b) => b.score - a.score);
    return alerts.slice(0, 2);
  }, [routeAnalysis?.samples]);

  const routeBadge = useMemo(() => {
    const g = routeAnalysis?.globalRisk;
    if (!g) return null;
    const variant = g.level === "extreme" ? "destructive" : g.level === "high" ? "default" : "secondary";
    return { variant, label: `${g.score}/100` };
  }, [routeAnalysis?.globalRisk]);

  const overviewRouteSubtitle = useMemo(() => {
    if (!route) return "Aucun trajet";
    if (routeStatus === "loading") return "Analyse en cours...";
    if (routeStatus === "error") return routeError ?? "Erreur";
    if (routeStatus === "ready" && routeAnalysis?.samples?.length) {
      const alerts = routeAnalysis.samples.filter((s) => s.risk.level === "high" || s.risk.level === "extreme").length;
      return alerts > 0 ? `${alerts} alerte(s) · score global` : "Aucune alerte majeure";
    }
    return "—";
  }, [route, routeAnalysis?.samples, routeError, routeStatus]);

  return (
    <ResponsiveInspector
      open
      onOpenChange={() => {
      }}
      title={title}
      nonModal
      className="pointer-events-auto"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <ToggleGroup
            type="single"
            value={tab}
            onValueChange={(v) => {
              const next = (v as HubTab) || "overview";
              setTab(clampTab(next, ctx));
            }}
            variant="outline"
            size="sm"
            className="justify-start"
          >
            <ToggleGroupItem value="overview">Aperçu</ToggleGroupItem>
            <ToggleGroupItem value="weather" disabled={!ctx.hasWeather}>
              Météo
            </ToggleGroupItem>
            <ToggleGroupItem value="route" disabled={!ctx.hasRoute}>
              Trajet
            </ToggleGroupItem>
            <ToggleGroupItem value="poi" disabled={!ctx.hasPoi}>
              POI
            </ToggleGroupItem>
          </ToggleGroup>

          {(ctx.hasWeather || ctx.hasRoute || ctx.hasPoi) && (
            <HubButton
              variant="ghost"
              size="sm"
              onClick={() => {
                onClearWeather();
                onClearRoute();
                onClearPoi();
                setTab("overview");
              }}
            >
              Tout effacer
            </HubButton>
          )}
        </div>

        {isMobile && (
          <div className="sticky bottom-0 -mx-5 pt-2 pb-3 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
            <div className="px-5">
              <ToggleGroup
                type="single"
                value={tab}
                onValueChange={(v) => {
                  const next = (v as HubTab) || "overview";
                  setTab(clampTab(next, ctx));
                }}
                variant="outline"
                size="sm"
                className="justify-start"
              >
                <ToggleGroupItem value="overview">Aperçu</ToggleGroupItem>
                <ToggleGroupItem value="weather" disabled={!ctx.hasWeather}>
                  Météo
                </ToggleGroupItem>
                <ToggleGroupItem value="route" disabled={!ctx.hasRoute}>
                  Trajet
                </ToggleGroupItem>
                <ToggleGroupItem value="poi" disabled={!ctx.hasPoi}>
                  POI
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        )}

        {tab === "overview" && (
          <OverviewTab
            ctx={ctx}
            weatherLocationName={weatherLocation?.name}
            miniWeather={miniWeather}
            useNauticalUnits={useNauticalUnits}
            onOpenWeather={() => setTab("weather")}
            routeProfile={routeProfile}
            onRouteProfileChange={onRouteProfileChange}
            routeBadge={routeBadge ?? undefined}
            overviewRouteSubtitle={overviewRouteSubtitle}
            routeAlertsPreview={routeAlertsPreview}
            onOpenRoute={() => setTab("route")}
            onClearRoute={onClearRoute}
            selectedPoi={selectedPoi}
            poiIsFavorite={poiIsFavorite}
            onOpenPoi={() => setTab("poi")}
            onClearPoi={onClearPoi}
          />
        )}

        {tab === "weather" && (
          <WeatherTab
            weatherLocation={weatherLocation}
            onClearWeather={onClearWeather}
            onBack={() => setTab("overview")}
            useNauticalUnits={useNauticalUnits}
          />
        )}

        {tab === "route" && (
          <RouteTab
            routeStops={routeStops}
            routeAddMode={routeAddMode}
            onRouteAddModeChange={onRouteAddModeChange}
            routeProfile={routeProfile}
            onRouteProfileChange={onRouteProfileChange}
            routeStatus={routeStatus}
            routeError={routeError}
            route={route}
            routeAnalysis={routeAnalysis}
            departureTs={departureTs}
            onDepartureTsChange={onDepartureTsChange}
            onClearRoute={onClearRoute}
            onRemoveRouteStop={onRemoveRouteStop}
            onMoveRouteStop={onMoveRouteStop}
            navStepIndex={navStepIndex}
            onNavStepIndexChange={setNavStepIndex}
            onBack={() => setTab("overview")}
            useNauticalUnits={useNauticalUnits}
          />
        )}

        {tab === "poi" && (
          <PoiTab
            selectedPoi={selectedPoi}
            onClearPoi={onClearPoi}
            onRequestWeatherAt={onRequestWeatherAt}
            onBack={() => setTab("overview")}
          />
        )}
      </div>
    </ResponsiveInspector>
  );
}
