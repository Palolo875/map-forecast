import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import MapView from "@/components/MapView";
import SearchBar from "@/components/SearchBar";
import { HugeiconsIcon, SunCloud02Icon } from "@/components/icons";
import { POI_DATASET } from "@/features/poi/dataset";
import type { Poi } from "@/features/poi/types";
import MapHub from "@/components/MapHub";
import MapLayerSelector from "@/components/MapLayerSelector";
import ThemeToggle from "@/components/ThemeToggle";
import { createValhallaAdapter } from "@/features/route/providers/ValhallaAdapter";
import { useRouteState } from "@/hooks/use-route-state";
import { useMapSettings } from "@/hooks/use-map-settings";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { fetchJson, PHOTON_BASE_URL, formatApiError } from "@/lib/api";
import { toast } from "@/components/ui/sonner";
import type { PhotonReverseResponse } from "@/features/geocode/photon";
import { QuickCapture } from "@/features/poi/QuickCapture";
import { getAllOverlays, getAllPois } from "@/features/poi/db";
import type { PoiUserOverlay } from "@/features/poi/types";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { HubBadge } from "@/components/maphub/shared";
import { ListFilter } from "lucide-react";

const Index = () => {
  const routingProvider = useRef(createValhallaAdapter());

  const [flyTo, setFlyTo] = useState<{ lng: number; lat: number } | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [weatherLocation, setWeatherLocation] = useState<{
    lat: number;
    lng: number;
    name: string;
  } | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);

  const [userPois, setUserPois] = useState<Poi[]>([]);
  const [favoritePoiIds, setFavoritePoiIds] = useState<Set<string>>(() => new Set());
  const [overlaysByPoiId, setOverlaysByPoiId] = useState<Record<string, PoiUserOverlay>>({});

  const [poiListOpen, setPoiListOpen] = useState(false);
  const [poiQuery, setPoiQuery] = useState("");
  const [poiTypeFilter, setPoiTypeFilter] = useState<string[]>(["refuge", "emergency_shelter", "weather_station", "spot", "note"]);

  const {
    routeStops,
    routeAddMode,
    routeProfile,
    routeStatus,
    routeError,
    route,
    routeAnalysis,
    departureTs,
    applySelectionToStops,
    onRouteProfileChange,
    setRouteAddMode,
    clearRoute,
    removeRouteStop,
    moveRouteStop,
    simulateDeparture,
  } = useRouteState(routingProvider.current);

  const resolveRefLocation = useCallback(() => {
    if (weatherLocation) return { lat: weatherLocation.lat, lng: weatherLocation.lng };
    if (routeStops.length > 0) return { lat: routeStops[0].lat, lng: routeStops[0].lng };
    if (flyTo) return { lat: flyTo.lat, lng: flyTo.lng };
    return null;
  }, [flyTo, routeStops, weatherLocation]);

  const {
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
  } = useMapSettings(resolveRefLocation);

  const isOnline = useOnlineStatus();

  useEffect(() => {
    let cancelled = false;
    const loadUserPoiData = async () => {
      try {
        const [poisFromDb, overlays] = await Promise.all([getAllPois(), getAllOverlays()]);
        if (cancelled) return;
        setUserPois(poisFromDb.filter((p) => p.source === "user"));
        setFavoritePoiIds(new Set(overlays.filter((o) => o.isFavorite).map((o) => o.poiId)));
        setOverlaysByPoiId(Object.fromEntries(overlays.map((o) => [o.poiId, o])));
      } catch {
        if (cancelled) return;
        setUserPois([]);
        setFavoritePoiIds(new Set());
        setOverlaysByPoiId({});
      }
    };

    loadUserPoiData();
    return () => {
      cancelled = true;
    };
  }, []);

  const mergedPois = useMemo(() => {
    // Dataset remains authoritative for dataset/api POIs; user POIs are additive.
    const byId = new Map<string, Poi>();
    for (const p of POI_DATASET) byId.set(p.id, p);
    for (const p of userPois) byId.set(p.id, p);
    return Array.from(byId.values());
  }, [userPois]);

  const filteredPois = useMemo(() => {
    const q = poiQuery.trim().toLowerCase();
    return mergedPois.filter((p) => {
      if (!poiTypeFilter.includes(p.type)) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q);
    });
  }, [mergedPois, poiQuery, poiTypeFilter]);

  const handleMapClick = useCallback(async (lng: number, lat: number) => {
    setHasInteracted(true);
    let name = `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
    try {
      const data = await fetchJson<PhotonReverseResponse>(
        `${PHOTON_BASE_URL}/reverse?lat=${lat}&lon=${lng}&lang=fr`,
        "photon",
      );
      const p = data.features?.[0]?.properties;
      if (p) {
        name = [p.name, p.city, p.country].filter(Boolean).join(", ");
      }
    } catch (e) {
      toast(formatApiError(e, "Recherche inverse indisponible."), { duration: 2500 });
    }
    setWeatherLocation({ lat, lng, name });

    applySelectionToStops({ lat, lng, name });
  }, [applySelectionToStops]);

  const handleSearchSelect = useCallback((lat: number, lng: number, name: string) => {
    setHasInteracted(true);
    setFlyTo({ lng, lat });
    setWeatherLocation({ lat, lng, name });

    applySelectionToStops({ lat, lng, name });
  }, [applySelectionToStops]);

  const handlePoiSelect = useCallback((poi: Poi) => {
    setHasInteracted(true);
    setSelectedPoi(poi);
    setFlyTo({ lng: poi.position.lng, lat: poi.position.lat });
  }, []);

  const weatherRisk = routeAnalysis?.globalRisk?.score ?? 0;

  return (
    <div className={`relative h-screen w-screen overflow-hidden bg-background ${mapTheme === 'high-contrast' ? 'high-contrast-mode' : ''}`}>
      {/* Map */}
      <MapView
        onMapClick={handleMapClick}
        flyTo={flyTo}
        pois={mergedPois}
        favoritePoiIds={favoritePoiIds}
        overlaysByPoiId={overlaysByPoiId}
        onPoiSelect={handlePoiSelect}
        selectedPoiId={selectedPoi?.id ?? null}
        routeLine={route?.line ?? null}
        routeSegments={routeAnalysis?.segments ?? null}
        fitToRoute={routeStatus === "ready"}
        mapMode={mapMode}
        mapTheme={mapTheme}
        isNight={mapIsNightNow}
        nauticalOverlay={mapNauticalOverlay || mapMode === "nautical"}
        weatherRisk={weatherRisk}
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

        {/* App Theme Toggle */}
        <ThemeToggle />

        {!isOnline && (
          <div className="float-card-sm px-3 py-2 flex items-center gap-2 text-[11px] text-destructive font-medium animate-fade-in shrink-0">
            <span>Hors ligne</span>
          </div>
        )}

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
      {!weatherLocation && !hasInteracted && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 animate-fade-in">
          <div className="float-card-sm px-5 py-3 text-[13px] text-muted-foreground">
            Cliquez sur la carte ou recherchez un lieu pour voir la météo
          </div>
        </div>
      )}

      {/* POI List — bottom sheet for search/filter without overloading map */}
      <div className="absolute bottom-5 left-5 z-20">
        <Drawer open={poiListOpen} onOpenChange={setPoiListOpen}>
          <DrawerTrigger asChild>
            <button
              type="button"
              className="float-card-sm px-3 py-2 flex items-center gap-2 text-[11px] text-foreground font-medium hover:bg-accent/10 transition"
            >
              <ListFilter className="w-4 h-4 text-primary" />
              <span>Liste POI</span>
              <HubBadge>{filteredPois.length}</HubBadge>
            </button>
          </DrawerTrigger>
          <DrawerContent className="misty-glass border-white/10">
            <DrawerHeader className="text-left">
              <DrawerTitle className="text-base">Points d’intérêt</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4 space-y-3">
              <Input value={poiQuery} onChange={(e) => setPoiQuery(e.target.value)} placeholder="Rechercher…" />

              <ToggleGroup
                type="multiple"
                value={poiTypeFilter}
                onValueChange={(v) => setPoiTypeFilter(v as string[])}
                className="flex flex-wrap justify-start"
              >
                <ToggleGroupItem value="refuge">Refuges</ToggleGroupItem>
                <ToggleGroupItem value="emergency_shelter">Abris</ToggleGroupItem>
                <ToggleGroupItem value="weather_station">Stations</ToggleGroupItem>
                <ToggleGroupItem value="spot">Spots</ToggleGroupItem>
                <ToggleGroupItem value="note">Notes</ToggleGroupItem>
              </ToggleGroup>

              <div className="max-h-[50vh] overflow-auto rounded-xl border border-white/10">
                {filteredPois.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full px-3 py-3 flex items-center justify-between gap-3 text-left hover:bg-accent/10"
                    onClick={() => {
                      handlePoiSelect(p);
                      setPoiListOpen(false);
                    }}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{p.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {p.type} · {p.source === "user" ? "perso" : "dataset"}
                      </div>
                    </div>
                    {favoritePoiIds.has(p.id) && (
                      <span className="text-[11px] font-semibold text-primary">Favori</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
};

export default Index;
