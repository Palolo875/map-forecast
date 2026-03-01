import { useState, useCallback } from "react";
import MapView from "@/components/MapView";
import SearchBar from "@/components/SearchBar";
import WeatherPanel from "@/components/WeatherPanel";
import { CloudSun } from "lucide-react";

const Index = () => {
  const [flyTo, setFlyTo] = useState<{ lng: number; lat: number } | null>(null);
  const [weatherLocation, setWeatherLocation] = useState<{
    lat: number;
    lng: number;
    name: string;
  } | null>(null);

  const handleMapClick = useCallback(async (lng: number, lat: number) => {
    // Reverse geocode with Photon
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
  }, []);

  const handleSearchSelect = useCallback((lat: number, lng: number, name: string) => {
    setFlyTo({ lng, lat });
    setWeatherLocation({ lat, lng, name });
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      {/* Map */}
      <MapView onMapClick={handleMapClick} flyTo={flyTo} />

      {/* Top overlay */}
      <div className="absolute top-5 left-5 right-5 z-10 flex items-start gap-3">
        {/* Logo */}
        <div className="float-card-sm flex items-center gap-2.5 px-4 py-3 shrink-0">
          <CloudSun className="h-5 w-5 text-primary" strokeWidth={1.5} />
          <span className="text-[15px] font-semibold text-foreground">
            NavéoMap
          </span>
        </div>

        {/* Search */}
        <SearchBar onSelect={handleSearchSelect} />
      </div>

      {/* Weather Panel */}
      {weatherLocation && (
        <div className="absolute bottom-5 left-5 z-10">
          <WeatherPanel
            lat={weatherLocation.lat}
            lng={weatherLocation.lng}
            locationName={weatherLocation.name}
            onClose={() => setWeatherLocation(null)}
          />
        </div>
      )}

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
