import { useRef, useEffect, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import type { Poi } from "@/features/poi/types";
import { useMap } from "@/map/MapContext";

interface MapViewProps {
  onMapClick?: (lng: number, lat: number) => void;
  flyTo?: { lng: number; lat: number } | null;
  pois?: Poi[];
  onPoiSelect?: (poi: Poi) => void;
  selectedPoiId?: string | null;
  routeLine?: GeoJSON.LineString | null;
  routeSegments?: GeoJSON.FeatureCollection<GeoJSON.LineString, { color?: string }> | null;
  fitToRoute?: boolean;

  mapMode?: "road" | "topo" | "satellite" | "nautical";
  mapTheme?: "light" | "dark" | "cream" | "high-contrast";
  isNight?: boolean;
  nauticalOverlay?: boolean;
}

const STYLE_ROAD_LIGHT = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const STYLE_ROAD_DARK = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

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
  onPoiSelect,
  selectedPoiId,
  routeLine,
  routeSegments,
  fitToRoute,
  mapMode = "road",
  mapTheme = "cream",
  isNight = false,
  nauticalOverlay = false,
}: MapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const poiMarkersRef = useRef<maplibregl.Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [styleTick, setStyleTick] = useState(0);
  const { setMap } = useMap();

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

    if (wantsDark) return STYLE_ROAD_DARK;
    return STYLE_ROAD_LIGHT;
  }, [isNight, mapMode, mapTheme]);

  function mapAutoTheme(theme: MapViewProps["mapTheme"]) {
    return theme === "cream" || theme === "light";
  }

  const placeMarker = useCallback((map: maplibregl.Map, lng: number, lat: number) => {
    if (markerRef.current) markerRef.current.remove();

    const el = document.createElement("div");
    el.className = "marker-pulse";
    el.style.width = "24px";
    el.style.height = "24px";
    el.style.borderRadius = "50%";
    el.style.background = "#9ED9C6";
    el.style.border = "4px solid #FAF8F4";
    el.style.boxShadow = "0 4px 16px rgba(158,217,198,0.6)";
    el.style.transition = "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)";

    markerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([lng, lat])
      .addTo(map);
  }, []);

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: STYLE_ROAD_LIGHT,
      center: [2.35, 48.85],
      zoom: 5,
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

    const onLoad = () => setReady(true);
    const onStyleData = () => setStyleTick((t) => t + 1);
    map.on("load", onLoad);
    map.on("styledata", onStyleData);

    map.on("click", (e) => {
      const { lng, lat } = e.lngLat;
      placeMarker(map, lng, lat);
      onMapClick?.(lng, lat);
    });

    mapRef.current = map;
    setMap(map);
    return () => {
      map.off("load", onLoad);
      map.off("styledata", onStyleData);
      setMap(null);
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || !ready) return;
    const map = mapRef.current;
    const nextStyle = resolveStyleUrl();

    map.setStyle(nextStyle, { diff: true });
  }, [mapMode, mapTheme, isNight, ready, resolveStyleUrl]);

  // Apply visual improvements to text labels when style changes
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    const map = mapRef.current;
    if (!map.isStyleLoaded()) return;

    // Improve text legibility on complex backgrounds (like satellite)
    const layers = map.getStyle().layers;
    if (layers) {
      layers.forEach(layer => {
        if (layer.type === 'symbol' && layer.paint) {
          // Add halos to text for better contrast
          map.setPaintProperty(layer.id, 'text-halo-width', 1.5);
          map.setPaintProperty(layer.id, 'text-halo-color', mapMode === 'satellite' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)');
          if (mapMode === 'satellite') {
            map.setPaintProperty(layer.id, 'text-color', '#FFFFFF');
          }
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

    if (!has && map.getLayer("raster")) {
      map.addLayer(
        {
          id: NIGHT_OVERLAY_LAYER_ID,
          type: "background",
          paint: {
            "background-color": "#0b0f14",
            "background-opacity": 0.35,
          },
        },
        NAUTICAL_LAYER_ID,
      );
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
    if (!mapRef.current || !ready) return;

    poiMarkersRef.current.forEach((m) => m.remove());
    poiMarkersRef.current = [];

    if (!pois || pois.length === 0) return;

    const map = mapRef.current;

    poiMarkersRef.current = pois.map((poi) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "poi-marker";
      el.style.width = "18px";
      el.style.height = "18px";
      el.style.borderRadius = "999px";
      el.style.border = "3px solid #FAF8F4";
      el.style.boxShadow = "0 3px 12px rgba(0,0,0,0.15)";
      el.style.background = poi.type === "weather_station" ? "#FFCB5E" : "#9ED9C6";
      el.style.cursor = "pointer";
      el.style.transition = "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)";

      if (selectedPoiId && poi.id === selectedPoiId) {
        el.style.transform = "scale(1.4)";
        el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)";
        el.style.zIndex = "10";
        el.style.borderColor = "#FFFFFF";
      }

      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        onPoiSelect?.(poi);
      });

      return new maplibregl.Marker({ element: el })
        .setLngLat([poi.position.lng, poi.position.lat])
        .addTo(map);
    });
  }, [pois, onPoiSelect, ready, selectedPoiId]);

  return (
    <div ref={mapContainer} className="absolute inset-0 rounded-3xl overflow-hidden shadow-inner" />
  );
};

export default MapView;
