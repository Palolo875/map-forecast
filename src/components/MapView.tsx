import { useRef, useEffect, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";

interface MapViewProps {
  onMapClick?: (lng: number, lat: number) => void;
  flyTo?: { lng: number; lat: number } | null;
}

const GENTLE_MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const MapView = ({ onMapClick, flyTo }: MapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
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
    if (!flyTo || !mapRef.current || !ready) return;
    mapRef.current.flyTo({ center: [flyTo.lng, flyTo.lat], zoom: 10, duration: 1400 });
    placeMarker(mapRef.current, flyTo.lng, flyTo.lat);
  }, [flyTo, ready, placeMarker]);

  return (
    <div ref={mapContainer} className="absolute inset-0 rounded-3xl overflow-hidden" />
  );
};

export default MapView;
