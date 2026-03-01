import { useEffect, useState } from "react";
import {
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudDrizzle,
  Wind, Droplets, Eye, Thermometer, ArrowUp, ArrowDown, CloudFog, X
} from "lucide-react";

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
}

const getWeatherInfo = (code: number): { label: string; Icon: typeof Sun; color: string } => {
  if (code === 0) return { label: "Dégagé", Icon: Sun, color: "text-weather-sun" };
  if (code <= 3) return { label: "Nuageux", Icon: Cloud, color: "text-muted-foreground" };
  if (code <= 48) return { label: "Brouillard", Icon: CloudFog, color: "text-muted-foreground" };
  if (code <= 57) return { label: "Bruine", Icon: CloudDrizzle, color: "text-weather-mint" };
  if (code <= 67) return { label: "Pluie", Icon: CloudRain, color: "text-weather-mint" };
  if (code <= 77) return { label: "Neige", Icon: CloudSnow, color: "text-weather-mint" };
  if (code <= 82) return { label: "Averses", Icon: CloudRain, color: "text-weather-mint" };
  if (code <= 86) return { label: "Neige", Icon: CloudSnow, color: "text-weather-mint" };
  return { label: "Orage", Icon: CloudLightning, color: "text-weather-orange" };
};

const WeatherPanel = ({ lat, lng, locationName, onClose }: WeatherPanelProps) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,precipitation&daily=temperature_2m_max,temperature_2m_min&hourly=temperature_2m,weather_code&timezone=auto&forecast_days=1`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        const c = data.current;
        const hourly = data.hourly.time.slice(0, 24).map((t: string, i: number) => ({
          time: t,
          temp: data.hourly.temperature_2m[i],
          code: data.hourly.weather_code[i],
        }));

        setWeather({
          temperature: Math.round(c.temperature_2m),
          feelsLike: Math.round(c.apparent_temperature),
          humidity: c.relative_humidity_2m,
          windSpeed: Math.round(c.wind_speed_10m),
          windDirection: c.wind_direction_10m,
          weatherCode: c.weather_code,
          visibility: 10,
          tempMax: Math.round(data.daily.temperature_2m_max[0]),
          tempMin: Math.round(data.daily.temperature_2m_min[0]),
          precipitation: c.precipitation,
          hourly,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [lat, lng]);

  if (loading) {
    return (
      <div className="float-card p-6 w-[340px] animate-float-in">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-32 bg-muted rounded-full animate-pulse" />
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
        <div className="h-16 w-24 bg-muted rounded-2xl animate-pulse mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!weather) return null;

  const { label, Icon, color } = getWeatherInfo(weather.weatherCode);

  const currentHour = new Date().getHours();
  const nextHours = weather.hourly.filter((h) => {
    const hour = new Date(h.time).getHours();
    return hour >= currentHour;
  }).slice(0, 6);

  return (
    <div className="float-card p-6 w-[340px] animate-float-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[15px] font-semibold text-foreground truncate max-w-[260px]">
          {locationName}
        </h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
      <p className="text-[13px] text-muted-foreground mb-4">{label}</p>

      {/* Main temp */}
      <div className="flex items-center gap-4 mb-5">
        <Icon className={`h-10 w-10 ${color}`} strokeWidth={1.5} />
        <div>
          <span className="impact-number text-foreground">{weather.temperature}°</span>
        </div>
        <div className="ml-auto text-right">
          <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
            <ArrowUp className="h-3 w-3" strokeWidth={2} />
            <span>{weather.tempMax}°</span>
          </div>
          <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
            <ArrowDown className="h-3 w-3" strokeWidth={2} />
            <span>{weather.tempMin}°</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        <StatCard icon={Thermometer} label="Ressenti" value={`${weather.feelsLike}°`} />
        <StatCard icon={Droplets} label="Humidité" value={`${weather.humidity}%`} />
        <StatCard icon={Wind} label="Vent" value={`${weather.windSpeed} km/h`} />
        <StatCard icon={Eye} label="Précipitations" value={`${weather.precipitation} mm`} />
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
              const HIcon = hInfo.Icon;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl bg-muted/40">
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(h.time).getHours()}h
                  </span>
                  <HIcon className={`h-4 w-4 ${hInfo.color}`} strokeWidth={1.5} />
                  <span className="text-[13px] font-semibold text-foreground">
                    {Math.round(h.temp)}°
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value }: { icon: typeof Sun; label: string; value: string }) => (
  <div className="float-card-sm px-3.5 py-3 flex items-center gap-2.5">
    <Icon className="h-4 w-4 text-primary shrink-0" strokeWidth={1.5} />
    <div>
      <p className="text-[11px] text-muted-foreground leading-none mb-0.5">{label}</p>
      <p className="text-[14px] font-semibold text-foreground leading-none">{value}</p>
    </div>
  </div>
);

export default WeatherPanel;
