export type HourlyWeatherPoint = {
  timeIso: string;
  ts: number;
  temperatureC?: number;
  windSpeedKmh?: number;
  precipitationMm?: number;
  weatherCode?: number;
  cloudCoverPct?: number;
};

type OpenMeteoHourlyResponse = {
  hourly?: {
    time: string[];
    temperature_2m?: number[];
    wind_speed_10m?: number[];
    precipitation?: number[];
    weather_code?: number[];
    cloud_cover?: number[];
  };
};

const hourlyCache = new Map<string, Promise<OpenMeteoHourlyResponse>>();

function cacheKey(lat: number, lng: number) {
  return `${lat.toFixed(3)}|${lng.toFixed(3)}`;
}

function nearestIndex(times: number[], target: number) {
  let bestI = 0;
  let bestD = Infinity;
  for (let i = 0; i < times.length; i += 1) {
    const d = Math.abs(times[i] - target);
    if (d < bestD) {
      bestD = d;
      bestI = i;
    }
  }
  return bestI;
}

export async function fetchHourlyWeatherAt(lat: number, lng: number, targetTs: number): Promise<HourlyWeatherPoint> {
  const key = cacheKey(lat, lng);
  const existing = hourlyCache.get(key);

  const fetchPromise =
    existing ??
    (async () => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,wind_speed_10m,precipitation,weather_code,cloud_cover&timezone=auto&forecast_days=2`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`OPEN_METEO_${res.status}`);
      return (await res.json()) as OpenMeteoHourlyResponse;
    })();

  if (!existing) hourlyCache.set(key, fetchPromise);

  let data: OpenMeteoHourlyResponse;
  try {
    data = await fetchPromise;
  } catch (e) {
    hourlyCache.delete(key);
    throw e;
  }

  const timesIso = data.hourly?.time ?? [];
  const times = timesIso.map((t) => new Date(t).getTime());
  if (!times.length) {
    return { timeIso: new Date(targetTs).toISOString(), ts: targetTs };
  }

  const i = nearestIndex(times, targetTs);

  const t = timesIso[i];
  return {
    timeIso: t,
    ts: times[i],
    temperatureC: typeof data.hourly?.temperature_2m?.[i] === "number" ? Math.round(data.hourly!.temperature_2m![i]!) : undefined,
    windSpeedKmh: typeof data.hourly?.wind_speed_10m?.[i] === "number" ? Math.round(data.hourly!.wind_speed_10m![i]!) : undefined,
    precipitationMm: typeof data.hourly?.precipitation?.[i] === "number" ? data.hourly!.precipitation![i] : undefined,
    weatherCode: typeof data.hourly?.weather_code?.[i] === "number" ? data.hourly!.weather_code![i] : undefined,
    cloudCoverPct: typeof data.hourly?.cloud_cover?.[i] === "number" ? data.hourly!.cloud_cover![i] : undefined,
  };
}
