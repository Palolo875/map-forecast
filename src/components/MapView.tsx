import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import maplibregl from "maplibre-gl";
import Supercluster from "supercluster";
import type { PointFeature } from "supercluster";
import type { Poi, PoiUserOverlay } from "@/features/poi/types";
import { useMap } from "@/map/MapContext";
import { cn } from "@/lib/utils";
import { computeIdealMatchScore } from "@/features/poi/ideal-score";
import { fetchCurrentWeatherSnapshot } from "@/features/poi/weather";

interface MapViewProps {
  onMapClick?: (lng: number, lat: number) => void;
  flyTo?: { lng: number; lat: number } | null;
  pois?: Poi[];
  favoritePoiIds?: Set<string>;
  overlaysByPoiId?: Record<string, PoiUserOverlay>;
  onPoiSelect?: (poi: Poi) => void;
  selectedPoiId?: string | null;
  routeLine?: GeoJSON.LineString | null;
  routeSegments?: GeoJSON.FeatureCollection<GeoJSON.LineString, { color?: string }> | null;
  fitToRoute?: boolean;

  mapMode?: "road" | "topo" | "satellite" | "nautical";
  mapTheme?: "light" | "dark" | "cream" | "high-contrast";
  isNight?: boolean;
  nauticalOverlay?: boolean;
  weatherRisk?: number; // 0 to 100
}

type ClusterProps = {
  highestRisk: number;
  isEmergency: number;
};

const STYLE_ROAD_LIGHT = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const STYLE_ROAD_DARK = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const DEFAULT_CENTER: [number, number] = [2.35, 48.85];
const DEFAULT_ZOOM = 5;

function rasterStyle(tiles: string[], attribution?: string, showHillshading = false) {
  const style: maplibregl.StyleSpecification = {
    version: 8 as const,
    sources: {
      raster: {
        type: "raster" as const,
        tiles,
        tileSize: 256,
        attribution,
      },
    },
    layers: [
      {
        id: "raster",
        type: "raster" as const,
        source: "raster",
        paint: {
          "raster-fade-duration": 300,
        },
      },
    ],
  };

  if (showHillshading) {
    style.sources!.terrain = {
      type: "raster-dem",
      tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
      encoding: "terrarium",
      tileSize: 256,
    };
    style.layers!.push({
      id: "hillshading",
      type: "hillshade",
      source: "terrain",
      paint: {
        "hillshade-exaggeration": 0.5,
        "hillshade-shadow-color": "#2D3748",
        "hillshade-highlight-color": "#FFFFFF",
        "hillshade-accent-color": "#4A5568",
      },
    });
  }

  return style;
}

const ROUTE_SOURCE_ID = "route";
const ROUTE_LAYER_ID = "route-line";
const ROUTE_CASING_LAYER_ID = "route-casing";

const NAUTICAL_SOURCE_ID = "nautical";
const NAUTICAL_LAYER_ID = "nautical-tiles";

const NIGHT_OVERLAY_LAYER_ID = "night-overlay";

const MapView = ({
  onMapClick,
  flyTo,
  pois,
  favoritePoiIds,
  overlaysByPoiId,
  onPoiSelect,
  selectedPoiId,
  routeLine,
  routeSegments,
  fitToRoute,
  mapMode = "road",
  mapTheme = "cream",
  isNight = false,
  nauticalOverlay = false,
  weatherRisk = 0,
}: MapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const poiMarkersRef = useRef<maplibregl.Marker[]>([]);
  const weatherCacheRef = useRef<Map<string, Promise<Awaited<ReturnType<typeof fetchCurrentWeatherSnapshot>>>>>(new Map());
  const [ready, setReady] = useState(false);
  const [styleTick, setStyleTick] = useState(0);
  const [mapError, setMapError] = useState<string | null>(null);
  const { setMap } = useMap();

  const clusterIndex = useMemo(() => {
    if (!pois || pois.length === 0) return null;

    const index = new Supercluster<Poi, ClusterProps>({
      radius: 60,
      maxZoom: 16,
      map: (props) => ({
        highestRisk: props.type === "emergency_shelter" || props.type === "refuge" ? 100 : 0,
        isEmergency: props.type === "emergency_shelter" || props.type === "refuge" ? 1 : 0,
      }),
      reduce: (acc, props) => {
        acc.highestRisk = Math.max(acc.highestRisk, props.highestRisk);
        acc.isEmergency += props.isEmergency;
      },
    });

    const points: Array<PointFeature<Poi>> = pois.map((poi) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [poi.position.lng, poi.position.lat],
      },
      properties: poi,
    }));

    index.load(points);
    return index;
  }, [pois]);

  const refreshPoiMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    poiMarkersRef.current.forEach((m) => m.remove());
    poiMarkersRef.current = [];

    if (!clusterIndex) return;

    const bounds = map.getBounds();
    const zoom = Math.floor(map.getZoom());
    const clusters = clusterIndex.getClusters(
      [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
      zoom,
    );

    poiMarkersRef.current = clusters.map((feature) => {
      const [lng, lat] = feature.geometry.coordinates;
      const props = feature.properties as unknown as {
        cluster?: boolean;
        point_count?: number;
        highestRisk?: number;
        isEmergency?: number;
      };

      if (props.cluster) {
        const count = props.point_count ?? 0;
        const hasEmergency = (props.isEmergency ?? 0) > 0;
        const isCritical = (props.highestRisk ?? 0) > 0 && weatherRisk > 50 && hasEmergency;

        const el = document.createElement("button");
        el.type = "button";
        el.className = cn(
          "cluster-marker misty-glass shadow-lg flex items-center justify-center font-bold transition-all duration-300",
          count < 10 ? "w-8 h-8 text-xs" : count < 50 ? "w-10 h-10 text-sm" : "w-12 h-12 text-base",
          hasEmergency && "border-2 border-primary/50",
          isCritical && "marker-pulse border-primary",
        );
        el.setAttribute("aria-label", `Cluster de ${count} points`);
        el.textContent = String(count);

        el.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const id = (feature as unknown as { id?: number }).id;
          if (typeof id !== "number") return;
          const expansionZoom = Math.min(clusterIndex.getClusterExpansionZoom(id), 18);
          map.flyTo({ center: [lng, lat], zoom: expansionZoom });
        });

        return new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
      }

      const poi = feature.properties as unknown as Poi;
      const isSelected = !!selectedPoiId && poi.id === selectedPoiId;
      const isFavorite = !!favoritePoiIds?.has(poi.id);
      const isEmergencyType = poi.type === "emergency_shelter" || poi.type === "refuge";
      const isCritical = weatherRisk > 50 && isEmergencyType;

      const overlay = overlaysByPoiId?.[poi.id];
      const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

      const el = document.createElement("button");
      el.type = "button";
      el.className = cn(
        "poi-marker transition-all duration-300",
        `marker-${poi.type}`,
        isFavorite && "marker-favorite",
        isSelected && "marker-selected scale-125 z-20",
        isCritical && "marker-pulse marker-emergency z-30 scale-110",
        !isCritical && !isSelected && isEmergencyType && weatherRisk > 30 && "scale-105 opacity-90",
      );
      if (poi.type === "weather_station") el.dataset.poiType = "weather-station";
      el.setAttribute("aria-label", poi.name ? `Sélectionner ${poi.name}` : "Sélectionner un point d’intérêt");
      el.setAttribute("aria-pressed", isSelected ? "true" : "false");

      if (poi.type === "weather_station" && isOnline) {
        const arrow = document.createElement("span");
        arrow.className = "marker-wind-arrow";
        el.appendChild(arrow);

        const cacheKey = `${poi.position.lat.toFixed(3)},${poi.position.lng.toFixed(3)}`;
        let p = weatherCacheRef.current.get(cacheKey);
        if (!p) {
          p = fetchCurrentWeatherSnapshot(poi.position.lat, poi.position.lng);
          weatherCacheRef.current.set(cacheKey, p);
        }

        p.then((current) => {
          if (typeof current.windDirectionDeg !== "number") return;
          arrow.style.transform = `rotate(${current.windDirectionDeg}deg)`;
          arrow.classList.add("marker-wind-ready");
        }).catch(() => {
          // ignore
        });
      }

      if (isFavorite && overlay?.idealWeather && isOnline) {
        const badge = document.createElement("span");
        badge.className = "marker-match-badge marker-match-loading";
        badge.textContent = "…";
        el.appendChild(badge);

        const cacheKey = `${poi.position.lat.toFixed(3)},${poi.position.lng.toFixed(3)}`;
        let p = weatherCacheRef.current.get(cacheKey);
        if (!p) {
          p = fetchCurrentWeatherSnapshot(poi.position.lat, poi.position.lng);
          weatherCacheRef.current.set(cacheKey, p);
        }

        p.then((current) => {
          const r = computeIdealMatchScore(overlay.idealWeather, current);
          if (!r) return;
          badge.textContent = `${r.score}%`;
          badge.classList.remove("marker-match-loading");
          badge.classList.add(r.status === "good" ? "marker-match-good" : r.status === "ok" ? "marker-match-ok" : "marker-match-bad");

          if (poi.name) {
            el.setAttribute("aria-label", `Sélectionner ${poi.name}. Match météo ${r.score}%.`);
          }
        }).catch(() => {
          badge.textContent = "--";
          badge.classList.remove("marker-match-loading");
          badge.classList.add("marker-match-bad");
        });
      }

      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        onPoiSelect?.(poi);
      });

      return new maplibregl.Marker({ element: el }).setLngLat([poi.position.lng, poi.position.lat]).addTo(map);
    });
  }, [clusterIndex, onPoiSelect, overlaysByPoiId, ready, selectedPoiId, favoritePoiIds, weatherRisk]);

  const isHighContrast = mapTheme === "high-contrast";

  const resolveStyleUrl = useCallback(() => {
    const wantsDark = mapTheme === "dark" || (mapAutoTheme(mapTheme) && isNight);

    if (mapMode === "topo") {
      return rasterStyle(
        ["https://tile.opentopomap.org/{z}/{x}/{y}.png"],
        "© OpenTopoMap (CC-BY-SA) · © OpenStreetMap contributors",
        true, // Enable hillshading for Topo mode
      );
    }

    if (mapMode === "satellite") {
      return rasterStyle(
        ["https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
        "Tiles © Esri",
      );
    }

    if (wantsDark) return "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json";
    return "https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json";
  }, [isNight, mapMode, mapTheme]);

  function mapAutoTheme(theme: MapViewProps["mapTheme"]) {
    return theme === "cream" || theme === "light";
  }

  const placeMarker = useCallback((map: maplibregl.Map, lng: number, lat: number) => {
    if (markerRef.current) markerRef.current.remove();

    const el = document.createElement("div");
    el.className = "map-marker marker-pulse grainy-overlay";

    markerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([lng, lat])
      .addTo(map);
  }, []);

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: STYLE_ROAD_LIGHT,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
      fadeDuration: 300, // Smooth transition between styles
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), "bottom-right");
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      "bottom-right"
    );

    const onLoad = () => {
      setMapError(null);
      setReady(true);
    };
    const onStyleData = () => setStyleTick((t) => t + 1);
    const onError = (e: maplibregl.ErrorEvent) => {
      const msg = e?.error?.message;
      setMapError(msg || "MAP_STYLE_ERROR");
    };
    map.on("load", onLoad);
    map.on("styledata", onStyleData);
    map.on("error", onError);

    map.on("click", (e) => {
      const { lng, lat } = e.lngLat;
      placeMarker(map, lng, lat);
      onMapClick?.(lng, lat);
    });

    map.on("moveend", refreshPoiMarkers);

    mapRef.current = map;
    setMap(map);
    return () => {
      map.off("load", onLoad);
      map.off("styledata", onStyleData);
      map.off("error", onError);
      map.off("moveend", refreshPoiMarkers);
      setMap(null);
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeMarker, onMapClick, refreshPoiMarkers, setMap]);

  useEffect(() => {
    if (!mapRef.current || !ready) return;
    const map = mapRef.current;
    const nextStyle = resolveStyleUrl();

    map.setStyle(nextStyle, { diff: true });
    map.once("idle", () => setStyleTick((t) => t + 1));
  }, [mapMode, mapTheme, isNight, ready, resolveStyleUrl]);

  // Apply visual improvements to text labels when style changes
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    const map = mapRef.current;
    if (!map.isStyleLoaded()) return;

    if (mapMode !== "satellite") return;

    // Improve text legibility on complex backgrounds (like satellite)
    const layers = map.getStyle().layers;
    if (layers) {
      layers.forEach((layer) => {
        if (layer.type !== "symbol") return;
        if (!layer.layout || !("text-field" in layer.layout)) return;
        try {
          map.setPaintProperty(layer.id, "text-halo-width", 1.5);
          map.setPaintProperty(layer.id, "text-halo-color", "rgba(0,0,0,0.8)");
          map.setPaintProperty(layer.id, "text-color", "#FFFFFF");
        } catch {
          // ignore unsupported paint properties for this layer
        }
      });
    }
  }, [mapMode, ready, styleTick]);

  useEffect(() => {
    if (!mapRef.current || !ready) return;
    const map = mapRef.current;
    if (!map.isStyleLoaded()) return;

    const wantsOverlay = isNight && mapAutoTheme(mapTheme);
    const has = !!map.getLayer(NIGHT_OVERLAY_LAYER_ID);
    if (!wantsOverlay) {
      if (has) map.removeLayer(NIGHT_OVERLAY_LAYER_ID);
      return;
    }

    if (!has) {
      const firstLayerId = map.getStyle().layers?.[0]?.id;
      try {
        map.addLayer(
          {
            id: NIGHT_OVERLAY_LAYER_ID,
            type: "background",
            paint: {
              "background-color": "#0b0f14",
              "background-opacity": 0.35,
            },
          },
          firstLayerId,
        );
      } catch {
        // ignore if style changes mid-flight
      }
    }
  }, [isNight, mapTheme, ready, styleTick]);

  useEffect(() => {
    if (!mapRef.current || !ready) return;
    const map = mapRef.current;
    if (!map.isStyleLoaded()) return;

    const existing = map.getSource(ROUTE_SOURCE_ID);
    if (!existing) {
      map.addSource(ROUTE_SOURCE_ID, {
        type: "geojson",
        data:
          routeSegments ??
          ({
            type: "Feature",
            properties: {},
            geometry: routeLine ?? { type: "LineString", coordinates: [] },
          } as GeoJSON.Feature<GeoJSON.LineString>),
      });

      // Add casing for better route visibility
      map.addLayer({
        id: ROUTE_CASING_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#FFFFFF",
          "line-width": isHighContrast ? 10 : 8,
          "line-opacity": 0.4,
        }
      });

      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": ["coalesce", ["get", "color"], "#0EA5E9"],
          "line-width": isHighContrast ? 7 : 5,
          "line-opacity": 1.0,
        },
      });
    }
  }, [isHighContrast, ready, routeLine, routeSegments, styleTick]);

  useEffect(() => {
    if (!mapRef.current || !ready) return;
    const map = mapRef.current;
    if (!map.isStyleLoaded()) return;
    const wants = nauticalOverlay;

    const existingSource = map.getSource(NAUTICAL_SOURCE_ID);
    const existingLayer = map.getLayer(NAUTICAL_LAYER_ID);

    if (!wants) {
      if (existingLayer) map.removeLayer(NAUTICAL_LAYER_ID);
      if (existingSource) map.removeSource(NAUTICAL_SOURCE_ID);
      return;
    }

    if (!existingSource) {
      map.addSource(NAUTICAL_SOURCE_ID, {
        type: "raster",
        tiles: ["https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"],
        tileSize: 256,
      });
    }

    if (!existingLayer) {
      map.addLayer({
        id: NAUTICAL_LAYER_ID,
        type: "raster",
        source: NAUTICAL_SOURCE_ID,
        paint: {
          "raster-opacity": 0.85,
        },
      });
    }
  }, [nauticalOverlay, ready, styleTick]);

  useEffect(() => {
    if (!mapRef.current || !ready) return;
    const map = mapRef.current;
    if (!map.isStyleLoaded()) return;
    const src = map.getSource(ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!src) return;

    if (routeSegments) {
      src.setData(routeSegments);
    } else {
      src.setData({
        type: "Feature",
        properties: {},
        geometry: routeLine ?? { type: "LineString", coordinates: [] },
      });
    }

    if (!fitToRoute) return;

    let coords: Array<[number, number]> = [];
    if (routeSegments?.features?.length) {
      coords = routeSegments.features.flatMap((f) => (f.geometry?.coordinates as Array<[number, number]>) ?? []);
    } else if (routeLine?.coordinates?.length) {
      coords = routeLine.coordinates as Array<[number, number]>;
    }

    if (coords.length < 2) return;

    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;

    for (const [lng, lat] of coords) {
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
    }

    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 70, duration: 1200, easing: (t) => t * (2 - t) }
    );
  }, [fitToRoute, ready, routeLine, routeSegments, styleTick]);

  useEffect(() => {
    if (!flyTo || !mapRef.current || !ready) return;
    mapRef.current.flyTo({ center: [flyTo.lng, flyTo.lat], zoom: 10, duration: 1800, easing: (t) => t * (2 - t) });
    placeMarker(mapRef.current, flyTo.lng, flyTo.lat);
  }, [flyTo, ready, placeMarker]);

  useEffect(() => {
    refreshPoiMarkers();
  }, [refreshPoiMarkers]);

  return (
    <div ref={mapContainer} className="absolute inset-0 rounded-3xl overflow-hidden grainy-overlay">
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/40 misty-glass">
          <div className="px-5 py-3 text-[13px] text-muted-foreground/80">
            Impossible de charger la carte. Réessaie dans un instant.
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;
