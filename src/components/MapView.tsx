import { useRef, useEffect, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import type { Poi } from "@/features/poi/types";

interface MapViewProps {
  onMapClick?: (lng: number, lat: number) => void;
  flyTo?: { lng: number; lat: number } | null;
  pois?: Poi[];
  onPoiSelect?: (poi: Poi) => void;
  selectedPoiId?: string | null;
  routeLine?: GeoJSON.LineString | null;
  routeSegments?: GeoJSON.FeatureCollection<GeoJSON.LineString, { color?: string }> | null;
  fitToRoute?: boolean;
}

const GENTLE_MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const ROUTE_SOURCE_ID = "route";
const ROUTE_LAYER_ID = "route-line";

const MapView = ({
  onMapClick,
  flyTo,
  pois,
  onPoiSelect,
  selectedPoiId,
  routeLine,
  routeSegments,
  fitToRoute,
}: MapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const poiMarkersRef = useRef<maplibregl.Marker[]>([]);
  const [ready, setReady] = useState(false);

  const placeMarker = useCallback((map: maplibregl.Map, lng: number, lat: number) => {
    if (markerRef.current) markerRef.current.remove();

    const el = document.createElement("div");
    el.style.width = "20px";
    el.style.height = "20px";
    el.style.borderRadius = "50%";
    el.style.background = "#9ED9C6";
    el.style.border = "4px solid #FAF8F4";
    el.style.boxShadow = "0 2px 12px rgba(158,217,198,0.4)";
    el.style.transition = "transform 0.2s ease";

    markerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([lng, lat])
      .addTo(map);
  }, []);

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: GENTLE_MAP_STYLE,
      center: [2.35, 48.85],
      zoom: 5,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), "bottom-right");
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      "bottom-right"
    );

    map.on("load", () => setReady(true));

    map.on("click", (e) => {
      const { lng, lat } = e.lngLat;
      placeMarker(map, lng, lat);
      onMapClick?.(lng, lat);
    });

    mapRef.current = map;
    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || !ready) return;
    const map = mapRef.current;

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
          "line-width": 5,
          "line-opacity": 0.9,
        },
      });
    }
  }, [ready, routeLine, routeSegments]);

  useEffect(() => {
    if (!mapRef.current || !ready) return;
    const map = mapRef.current;
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
      { padding: 70, duration: 900 }
    );
  }, [fitToRoute, ready, routeLine, routeSegments]);

  useEffect(() => {
    if (!flyTo || !mapRef.current || !ready) return;
    mapRef.current.flyTo({ center: [flyTo.lng, flyTo.lat], zoom: 10, duration: 1400 });
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
      el.style.width = "14px";
      el.style.height = "14px";
      el.style.borderRadius = "999px";
      el.style.border = "3px solid #FAF8F4";
      el.style.boxShadow = "0 2px 10px rgba(0,0,0,0.10)";
      el.style.background = poi.type === "weather_station" ? "#FFCB5E" : "#9ED9C6";
      el.style.cursor = "pointer";
      el.style.transition = "transform 0.15s ease, box-shadow 0.15s ease";

      if (selectedPoiId && poi.id === selectedPoiId) {
        el.style.transform = "scale(1.25)";
        el.style.boxShadow = "0 6px 18px rgba(0,0,0,0.18)";
        el.style.outline = "2px solid rgba(0,0,0,0.25)";
        el.style.outlineOffset = "2px";
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
    <div ref={mapContainer} className="absolute inset-0 rounded-3xl overflow-hidden" />
  );
};

export default MapView;
