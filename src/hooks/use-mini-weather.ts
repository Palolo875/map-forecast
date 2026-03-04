import { useEffect, useState } from "react";
import { fetchJson, OPEN_METEO_BASE_URL } from "@/lib/api";

type MiniWeatherLocation = { lat: number; lng: number } | null;

type MiniWeather =
  | { status: "idle" | "loading" | "ready" | "error"; temperature?: number; windKmh?: number; precipitationMm?: number; code?: number }
  | null;

type OpenMeteoMiniResponse = {
  current?: {
    temperature_2m?: number;
    wind_speed_10m?: number;
    precipitation?: number;
    weather_code?: number;
  };
};

export function useMiniWeather(weatherLocation: MiniWeatherLocation): MiniWeather {
  const [miniWeather, setMiniWeather] = useState<MiniWeather>(null);

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
        const data = await fetchJson<OpenMeteoMiniResponse>(url, "open-meteo");
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

  return miniWeather;
}
