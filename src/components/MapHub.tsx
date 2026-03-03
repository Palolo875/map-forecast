import { useEffect, useMemo, useState } from "react";
import type { Poi } from "@/features/poi/types";
import type { RouteResult } from "@/features/route/valhalla";
import type { RouteAnalysis } from "@/features/route/analyze";
import { loadPoiUserState } from "@/features/poi/storage";
import ResponsiveInspector from "@/components/ResponsiveInspector";
import WeatherPanel from "@/components/WeatherPanel";
import POIInspector from "@/components/poi/POIInspector";
import RouteInspector from "@/components/route/RouteInspector";
import TurnByTurn from "@/components/route/TurnByTurn";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { badgeVariants, type BadgeProps } from "@/components/ui/badge";
import { buttonVariants, type ButtonProps } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const OPEN_METEO_BASE_URL = import.meta.env.VITE_OPEN_METEO_BASE_URL ?? "https://api.open-meteo.com";

export type HubWeatherLocation = {
  lat: number;
  lng: number;
  name: string;
};

type HubTab = "overview" | "weather" | "route" | "poi";

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
};

function clampTab(tab: HubTab, ctx: { hasWeather: boolean; hasRoute: boolean; hasPoi: boolean }): HubTab {
  if (tab === "weather" && !ctx.hasWeather) return "overview";
  if (tab === "route" && !ctx.hasRoute) return "overview";
  if (tab === "poi" && !ctx.hasPoi) return "overview";
  return tab;
}

function labelPoiType(type: Poi["type"]) {
  switch (type) {
    case "refuge":
      return "Refuge";
    case "emergency_shelter":
      return "Abri";
    case "weather_station":
      return "Station météo";
    case "spot":
      return "Spot";
  }
}

function labelWeather(code: number) {
  if (code === 0) return "Dégagé";
  if (code <= 3) return "Nuageux";
  if (code <= 48) return "Brouillard";
  if (code <= 57) return "Bruine";
  if (code <= 67) return "Pluie";
  if (code <= 77) return "Neige";
  if (code <= 82) return "Averses";
  if (code <= 86) return "Neige";
  return "Orage";
}

function HubBadge({ variant, children }: { variant: BadgeProps["variant"]; children: React.ReactNode }) {
  return <div className={cn(badgeVariants({ variant }))}>{children}</div>;
}

function HubButton({
  variant,
  size,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant: ButtonProps["variant"]; size?: ButtonProps["size"] }) {
  return <button className={cn(buttonVariants({ variant, size: size ?? "default" }), className)} {...props} />;
}

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
}: MapHubProps) {
  const isMobile = useIsMobile();
  const ctx = useMemo(
    () => ({ hasWeather: !!weatherLocation, hasRoute: routeStops.length > 0, hasPoi: !!selectedPoi }),
    [routeStops.length, selectedPoi, weatherLocation],
  );

  const [tab, setTab] = useState<HubTab>("overview");

  const [navStepIndex, setNavStepIndex] = useState<number>(0);

  const [miniWeather, setMiniWeather] = useState<
    | { status: "idle" | "loading" | "ready" | "error"; temperature?: number; windKmh?: number; precipitationMm?: number; code?: number }
    | null
  >(null);

  const [poiIsFavorite, setPoiIsFavorite] = useState<boolean>(false);

  useEffect(() => {
    setTab((t) => clampTab(t, ctx));
  }, [ctx]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!weatherLocation) {
        setMiniWeather(null);
        return;
      }

      setMiniWeather({ status: "loading" });
      try {
        const url = `${OPEN_METEO_BASE_URL}/v1/forecast?latitude=${weatherLocation.lat}&longitude=${weatherLocation.lng}&current=temperature_2m,weather_code,wind_speed_10m,precipitation&timezone=auto`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`OPEN_METEO_${res.status}`);
        const data = await res.json();
        const c = data.current ?? {};
        const temperature = typeof c.temperature_2m === "number" ? Math.round(c.temperature_2m) : undefined;
        const windKmh = typeof c.wind_speed_10m === "number" ? Math.round(c.wind_speed_10m) : undefined;
        const precipitationMm = typeof c.precipitation === "number" ? c.precipitation : undefined;
        const code = typeof c.weather_code === "number" ? c.weather_code : undefined;
        if (cancelled) return;
        setMiniWeather({ status: "ready", temperature, windKmh, precipitationMm, code });
      } catch {
        if (cancelled) return;
        setMiniWeather({ status: "error" });
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [weatherLocation]);

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
      if (routeStops.length >= 2) return `${routeStops[0]!.name} → ${routeStops[routeStops.length - 1]!.name}`;
      if (routeStops.length === 1) return `Départ: ${routeStops[0]!.name}`;
      return "Trajet";
    }

    if (selectedPoi?.name) return selectedPoi.name;
    if (routeStops.length >= 2) return `Trajet vers ${routeStops[routeStops.length - 1]!.name}`;
    if (weatherLocation?.name) return weatherLocation.name;
    return "Hub";
  }, [routeStops, selectedPoi?.name, tab, weatherLocation?.name]);

  const routeBadge = useMemo(() => {
    const g = routeAnalysis?.globalRisk;
    if (!g) return null;
    const variant: BadgeProps["variant"] = g.level === "extreme" ? "destructive" : g.level === "high" ? "default" : "secondary";
    return <HubBadge variant={variant}>{g.score}/100</HubBadge>;
  }, [routeAnalysis?.globalRisk]);

  const routeProfileLabel = useMemo(() => {
    if (routeProfile === "bicycle") return "Vélo";
    if (routeProfile === "pedestrian") return "Marche";
    return "Voiture";
  }, [routeProfile]);

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
        // Hub persistant
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
          <div className="space-y-3">
            <Accordion
              type="multiple"
              defaultValue={[ctx.hasWeather ? "weather" : null, ctx.hasRoute ? "route" : null, ctx.hasPoi ? "poi" : null].filter(Boolean) as string[]}
              className="space-y-3"
            >
              <AccordionItem value="weather" className="float-card-sm px-4 py-0 overflow-hidden border-0">
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center justify-between gap-3 w-full">
                    <div className="text-sm font-medium text-foreground">Météo</div>
                    <HubBadge variant="secondary">{ctx.hasWeather ? "Actif" : "—"}</HubBadge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-0">
                  <div className="pb-3 space-y-2">
                    {ctx.hasWeather ? (
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">{weatherLocation!.name}</div>
                        {miniWeather?.status === "loading" ? (
                          <div className="h-10 rounded-xl bg-muted animate-pulse" />
                        ) : miniWeather?.status === "ready" ? (
                          <div className="grid grid-cols-3 gap-2">
                            <div className="rounded-xl border bg-muted/20 px-3 py-2">
                              <div className="text-[11px] text-muted-foreground">Maintenant</div>
                              <div className="text-sm font-semibold text-foreground">
                                {miniWeather.temperature !== undefined ? `${miniWeather.temperature}°` : "—"}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {typeof miniWeather.code === "number" ? labelWeather(miniWeather.code) : "—"}
                              </div>
                            </div>
                            <div className="rounded-xl border bg-muted/20 px-3 py-2">
                              <div className="text-[11px] text-muted-foreground">Vent</div>
                              <div className="text-sm font-semibold text-foreground">
                                {miniWeather.windKmh !== undefined ? `${miniWeather.windKmh} km/h` : "—"}
                              </div>
                            </div>
                            <div className="rounded-xl border bg-muted/20 px-3 py-2">
                              <div className="text-[11px] text-muted-foreground">Pluie</div>
                              <div className="text-sm font-semibold text-foreground">
                                {miniWeather.precipitationMm !== undefined ? `${miniWeather.precipitationMm} mm` : "—"}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">Impossible de charger le résumé météo.</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Clique sur la carte ou recherche un lieu.</div>
                    )}
                    {ctx.hasWeather && (
                      <div className="pt-1">
                        <HubButton variant="outline" size="sm" onClick={() => setTab("weather")}>
                          Voir détails
                        </HubButton>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="route" className="float-card-sm px-4 py-0 overflow-hidden border-0">
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center justify-between gap-3 w-full">
                    <div className="text-sm font-medium text-foreground">Trajet</div>
                    {routeBadge ?? <HubBadge variant="secondary">—</HubBadge>}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-0">
                  <div className="pb-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-muted-foreground">Mode</div>
                      <ToggleGroup
                        type="single"
                        value={routeProfile}
                        onValueChange={(v) => {
                          const next = (v as typeof routeProfile) || routeProfile;
                          onRouteProfileChange(next);
                        }}
                        variant="outline"
                        size="sm"
                        className="justify-start"
                      >
                        <ToggleGroupItem value="auto">Voiture</ToggleGroupItem>
                        <ToggleGroupItem value="bicycle">Vélo</ToggleGroupItem>
                        <ToggleGroupItem value="pedestrian">Marche</ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                    <div className="text-sm text-muted-foreground">{overviewRouteSubtitle}</div>
                    {ctx.hasRoute && routeAlertsPreview.length > 0 && (
                      <div className="space-y-2">
                        {routeAlertsPreview.map((a) => (
                          <button
                            key={`${a.index}-${a.ts}`}
                            type="button"
                            className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-left hover:bg-muted/30"
                            onClick={() => setTab("route")}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-xs font-medium text-foreground">
                                {new Date(a.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </div>
                              <HubBadge variant="default">{a.score}/100</HubBadge>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">{a.reason}</div>
                          </button>
                        ))}
                      </div>
                    )}
                    {ctx.hasRoute && (
                      <div className="pt-1 flex items-center gap-2">
                        <HubButton variant="outline" size="sm" onClick={() => setTab("route")}>
                          Inspecter
                        </HubButton>
                        <HubButton variant="ghost" size="sm" onClick={onClearRoute}>
                          Réinitialiser
                        </HubButton>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="poi" className="float-card-sm px-4 py-0 overflow-hidden border-0">
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center justify-between gap-3 w-full">
                    <div className="text-sm font-medium text-foreground">POI</div>
                    <HubBadge variant="secondary">{ctx.hasPoi ? "Sélection" : "—"}</HubBadge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-0">
                  <div className="pb-3 space-y-2">
                    {ctx.hasPoi ? (
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">{selectedPoi!.name}</div>
                        <div className="flex items-center gap-2">
                          <HubBadge variant="outline">{labelPoiType(selectedPoi!.type)}</HubBadge>
                          {poiIsFavorite && <HubBadge variant="secondary">Favori</HubBadge>}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Sélectionne un point sur la carte.</div>
                    )}
                    {ctx.hasPoi && (
                      <div className="pt-1 flex items-center gap-2">
                        <HubButton variant="outline" size="sm" onClick={() => setTab("poi")}>
                          Ouvrir
                        </HubButton>
                        <HubButton variant="ghost" size="sm" onClick={onClearPoi}>
                          Fermer
                        </HubButton>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}

        {tab === "weather" && (
          <div className="space-y-3">
            {weatherLocation ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <HubButton variant="outline" size="sm" onClick={() => setTab("overview")}>
                    Retour
                  </HubButton>
                  <HubButton variant="ghost" size="sm" onClick={onClearWeather}>
                    Fermer
                  </HubButton>
                </div>
                <div className="float-card-sm px-4 py-4">
                  <WeatherPanel
                    lat={weatherLocation.lat}
                    lng={weatherLocation.lng}
                    locationName={weatherLocation.name}
                    onClose={onClearWeather}
                    embedded
                  />
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Sélectionne un lieu pour voir la météo.</div>
            )}
          </div>
        )}

        {tab === "route" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <HubButton variant="outline" size="sm" onClick={() => setTab("overview")}>
                Retour
              </HubButton>
              <HubButton variant="ghost" size="sm" onClick={onClearRoute}>
                Fermer
              </HubButton>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">Mode</div>
              <ToggleGroup
                type="single"
                value={routeProfile}
                onValueChange={(v) => {
                  const next = (v as typeof routeProfile) || routeProfile;
                  onRouteProfileChange(next);
                }}
                variant="outline"
                size="sm"
                className="justify-start"
              >
                <ToggleGroupItem value="auto">Voiture</ToggleGroupItem>
                <ToggleGroupItem value="bicycle">Vélo</ToggleGroupItem>
                <ToggleGroupItem value="pedestrian">Marche</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="text-xs text-muted-foreground">Actuel: {routeProfileLabel}</div>

            <div className="float-card-sm px-4 py-3 space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ajout</div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">Prochaine sélection</div>
                <ToggleGroup
                  type="single"
                  value={routeAddMode}
                  onValueChange={(v) => {
                    const next = (v as typeof routeAddMode) || routeAddMode;
                    onRouteAddModeChange(next);
                  }}
                  variant="outline"
                  size="sm"
                  className="justify-start"
                >
                  <ToggleGroupItem value="start">Départ</ToggleGroupItem>
                  <ToggleGroupItem value="via">Étape</ToggleGroupItem>
                  <ToggleGroupItem value="end">Arrivée</ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="text-[11px] text-muted-foreground">Clique sur la carte ou utilise la recherche.</div>
            </div>

            {routeStops.length > 0 && (
              <div className="float-card-sm px-4 py-3 space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Étapes</div>
                <div className="space-y-2">
                  {routeStops.map((s, i) => (
                    <div key={`${i}-${s.name}`} className="flex items-center justify-between gap-2 rounded-2xl border bg-muted/20 px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-[11px] text-muted-foreground">{i === 0 ? "Départ" : i === routeStops.length - 1 ? "Arrivée" : `Étape ${i}`}</div>
                        <div className="text-sm font-medium text-foreground truncate">{s.name}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <HubButton
                          variant="ghost"
                          size="sm"
                          onClick={() => onMoveRouteStop(i, -1)}
                          disabled={i === 0 || routeStatus === "loading"}
                        >
                          Monter
                        </HubButton>
                        <HubButton
                          variant="ghost"
                          size="sm"
                          onClick={() => onMoveRouteStop(i, 1)}
                          disabled={i === routeStops.length - 1 || routeStatus === "loading"}
                        >
                          Descendre
                        </HubButton>
                        <HubButton
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveRouteStop(i)}
                          disabled={routeStatus === "loading"}
                        >
                          Suppr.
                        </HubButton>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {route && (route.maneuvers?.length ?? 0) > 0 && (
              <TurnByTurn route={route} stepIndex={navStepIndex} onStepIndexChange={setNavStepIndex} />
            )}

            <RouteInspector
              originLabel={routeStops[0]?.name}
              destinationLabel={routeStops.length >= 2 ? routeStops[routeStops.length - 1]?.name : undefined}
              status={routeStatus}
              errorMessage={routeError}
              route={route}
              analysis={routeAnalysis}
              departureTs={departureTs}
              onDepartureTsChange={onDepartureTsChange}
              onClear={onClearRoute}
            />
          </div>
        )}

        {tab === "poi" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <HubButton variant="outline" size="sm" onClick={() => setTab("overview")}>
                Retour
              </HubButton>
              <HubButton variant="ghost" size="sm" onClick={onClearPoi}>
                Fermer
              </HubButton>
            </div>
            <Separator />
            {selectedPoi ? (
              <POIInspector poi={selectedPoi} onRequestWeatherAt={onRequestWeatherAt} />
            ) : (
              <div className="text-sm text-muted-foreground">Sélectionne un POI sur la carte.</div>
            )}
          </div>
        )}
      </div>
    </ResponsiveInspector>
  );
}
