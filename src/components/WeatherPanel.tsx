import { useEffect, useState } from "react";
import {
  HugeiconsIcon,
  Sun03Icon,
  CloudIcon,
  SunCloudAngledRain01Icon,
  SnowIcon,
  ZapIcon,
  RainDropIcon,
  DropletIcon,
  ViewIcon,
  TemperatureIcon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  Cancel01Icon,
  HumidityIcon,
  WindTurbineIcon,
} from "@/components/icons";
import type { IconSvgElement } from "@/components/icons";

interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  weatherCode: number;
  visibility: number;
  tempMax: number;
  tempMin: number;
  precipitation: number;
  hourly: { time: string; temp: number; code: number }[];
}

interface WeatherPanelProps {
  lat: number;
  lng: number;
  locationName: string;
  onClose: () => void;
  embedded?: boolean;
  useNauticalUnits?: boolean;
}

type OpenMeteoWeatherResponse = {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    precipitation?: number;
    weather_code?: number;
  };
  daily?: {
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    weather_code?: number[];
  };
};

const OPEN_METEO_BASE_URL = import.meta.env.VITE_OPEN_METEO_BASE_URL ?? "https://api.open-meteo.com";

const getWeatherInfo = (code: number): { label: string; icon: IconSvgElement; color: string } => {
  if (code === 0) return { label: "Dégagé", icon: Sun03Icon, color: "text-weather-sun" };
  if (code <= 3) return { label: "Nuageux", icon: CloudIcon, color: "text-muted-foreground" };
  if (code <= 48) return { label: "Brouillard", icon: CloudIcon, color: "text-muted-foreground" };
  if (code <= 57) return { label: "Bruine", icon: RainDropIcon, color: "text-weather-mint" };
  if (code <= 67) return { label: "Pluie", icon: SunCloudAngledRain01Icon, color: "text-weather-mint" };
  if (code <= 77) return { label: "Neige", icon: SnowIcon, color: "text-weather-mint" };
  if (code <= 82) return { label: "Averses", icon: SunCloudAngledRain01Icon, color: "text-weather-mint" };
  if (code <= 86) return { label: "Neige", icon: SnowIcon, color: "text-weather-mint" };
  return { label: "Orage", icon: ZapIcon, color: "text-weather-orange" };
};

const WeatherPanel = ({ lat, lng, locationName, onClose, embedded, useNauticalUnits }: WeatherPanelProps) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const url = `${OPEN_METEO_BASE_URL}/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,precipitation&daily=temperature_2m_max,temperature_2m_min&hourly=temperature_2m,weather_code&timezone=auto&forecast_days=1`;

    fetch(url, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`OPEN_METEO_${r.status}`);
        return r.json();
      })
      .then((data) => {
        const payload = data as OpenMeteoWeatherResponse;
        const c = payload.current;
        const hourlyTimes = payload.hourly?.time ?? [];
        const hourlyTemps = payload.hourly?.temperature_2m ?? [];
        const hourlyCodes = payload.hourly?.weather_code ?? [];
        const hourly = hourlyTimes.slice(0, 24).map((t, i) => ({
          time: t,
          temp: hourlyTemps[i] ?? 0,
          code: hourlyCodes[i] ?? 0,
        }));
        if (!c) throw new Error("OPEN_METEO_PAYLOAD");
        const tempMax = payload.daily?.temperature_2m_max?.[0];
        const tempMin = payload.daily?.temperature_2m_min?.[0];
        if (typeof tempMax !== "number" || typeof tempMin !== "number") throw new Error("OPEN_METEO_DAILY");

        setWeather({
          temperature: Math.round(c.temperature_2m ?? 0),
          feelsLike: Math.round(c.apparent_temperature ?? 0),
          humidity: c.relative_humidity_2m ?? 0,
          windSpeed: Math.round(c.wind_speed_10m ?? 0),
          windDirection: c.wind_direction_10m ?? 0,
          weatherCode: c.weather_code ?? 0,
          visibility: 10,
          tempMax: Math.round(tempMax),
          tempMin: Math.round(tempMin),
          precipitation: c.precipitation ?? 0,
          hourly,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => controller.abort();
  }, [lat, lng]);

  if (loading) {
    const Wrapper = embedded ? "div" : "div";
    const wrapperClass = embedded ? "" : "float-card p-6 w-[340px] animate-float-in";
    return (
      <Wrapper className={wrapperClass}>
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-32 bg-muted rounded-full animate-pulse" />
          {!embedded && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.5} />
            </button>
          )}
        </div>
        <div className="h-16 w-24 bg-muted rounded-2xl animate-pulse mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      </Wrapper>
    );
  }

  if (!weather) return null;

  const { label, icon: weatherIcon, color } = getWeatherInfo(weather.weatherCode);

  const currentHour = new Date().getHours();
  const nextHours = weather.hourly.filter((h) => {
    const hour = new Date(h.time).getHours();
    return hour >= currentHour;
  }).slice(0, 6);

  const Wrapper = embedded ? "div" : "div";
  const wrapperClass = embedded ? "" : "float-card p-6 w-[340px] animate-float-in";

  return (
    <Wrapper className={wrapperClass}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[15px] font-semibold text-foreground truncate max-w-[260px]">
          {locationName}
        </h3>
        {!embedded && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.5} />
          </button>
        )}
      </div>
      <p className="text-[13px] text-muted-foreground mb-4">{label}</p>

      {/* Main temp */}
      <div className="flex items-center gap-4 mb-5">
        <HugeiconsIcon icon={weatherIcon} size={40} className={color} strokeWidth={1.5} />
        <div>
          <span className="impact-number text-foreground">{weather.temperature}°</span>
        </div>
        <div className="ml-auto text-right">
          <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
            <HugeiconsIcon icon={ArrowUp01Icon} size={12} strokeWidth={2} />
            <span>{weather.tempMax}°</span>
          </div>
          <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
            <HugeiconsIcon icon={ArrowDown01Icon} size={12} strokeWidth={2} />
            <span>{weather.tempMin}°</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        <StatCard icon={TemperatureIcon} label="Ressenti" value={`${weather.feelsLike}°`} />
        <StatCard icon={HumidityIcon} label="Humidité" value={`${weather.humidity}%`} />
        <StatCard
          icon={WindTurbineIcon}
          label="Vent"
          value={useNauticalUnits
            ? `${Math.round(weather.windSpeed / 1.852)} kt`
            : `${weather.windSpeed} km/h`
          }
        />
        <StatCard icon={DropletIcon} label="Précipitations" value={`${weather.precipitation} mm`} />
      </div>

      {/* Hourly forecast */}
      {nextHours.length > 0 && (
        <>
          <div className="gentle-separator border-t mb-3" />
          <p className="text-[12px] text-muted-foreground font-medium mb-2.5 uppercase tracking-wider">
            Prochaines heures
          </p>
          <div className="flex gap-1">
            {nextHours.map((h, i) => {
              const hInfo = getWeatherInfo(h.code);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl bg-muted/40">
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(h.time).getHours()}h
                  </span>
                  <HugeiconsIcon icon={hInfo.icon} size={16} className={hInfo.color} strokeWidth={1.5} />
                  <span className="text-[13px] font-semibold text-foreground">
                    {Math.round(h.temp)}°
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Wrapper>
  );
};

const StatCard = ({ icon, label, value }: { icon: IconSvgElement; label: string; value: string }) => (
  <div className="float-card-sm px-3.5 py-3 flex items-center gap-2.5">
    <HugeiconsIcon icon={icon} size={16} className="text-primary shrink-0" strokeWidth={1.5} />
    <div>
      <p className="text-[11px] text-muted-foreground leading-none mb-0.5">{label}</p>
      <p className="text-[14px] font-semibold text-foreground leading-none">{value}</p>
    </div>
  </div>
);

export default WeatherPanel;
