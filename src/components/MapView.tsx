import { useRef, useEffect, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";

interface MapViewProps {
  onMapClick?: (lng: number, lat: number) => void;
  flyTo?: { lng: number; lat: number } | null;
}

const MapView = ({ onMapClick, flyTo }: MapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [2.35, 48.85],
      zoom: 5,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), "bottom-right");
    map.addControl(new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    }), "bottom-right");

    map.on("load", () => setReady(true));

    map.on("click", (e) => {
      const { lng, lat } = e.lngLat;
      placeMarker(map, lng, lat);
      onMapClick?.(lng, lat);
    });

    mapRef.current = map;

    return () => map.remove();
  }, []);

  const placeMarker = useCallback((map: maplibregl.Map, lng: number, lat: number) => {
    if (markerRef.current) markerRef.current.remove();

    const el = document.createElement("div");
    el.style.width = "18px";
    el.style.height = "18px";
    el.style.borderRadius = "50%";
    el.style.background = "hsl(185 80% 50%)";
    el.style.border = "3px solid hsl(185 80% 70%)";
    el.style.boxShadow = "0 0 15px hsl(185 80% 50% / 0.6)";

    markerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([lng, lat])
      .addTo(map);
  }, []);

  useEffect(() => {
    if (!flyTo || !mapRef.current || !ready) return;
    mapRef.current.flyTo({ center: [flyTo.lng, flyTo.lat], zoom: 10, duration: 1500 });
    placeMarker(mapRef.current, flyTo.lng, flyTo.lat);
  }, [flyTo, ready, placeMarker]);

  return <div ref={mapContainer} className="absolute inset-0" />;
};

export default MapView;
