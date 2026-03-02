export type CurrentWeatherSnapshot = {
  temperatureC?: number;
  windSpeedKmh?: number;
  precipitationMm?: number;
  weatherCode?: number;
  cloudCoverPct?: number;
};

export async function fetchCurrentWeatherSnapshot(lat: number, lng: number): Promise<CurrentWeatherSnapshot> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m,precipitation,cloud_cover&timezone=auto`;
  const res = await fetch(url);
  const data = await res.json();
  const c = data?.current;

  return {
    temperatureC: typeof c?.temperature_2m === "number" ? Math.round(c.temperature_2m) : undefined,
    windSpeedKmh: typeof c?.wind_speed_10m === "number" ? Math.round(c.wind_speed_10m) : undefined,
    precipitationMm: typeof c?.precipitation === "number" ? c.precipitation : undefined,
    weatherCode: typeof c?.weather_code === "number" ? c.weather_code : undefined,
    cloudCoverPct: typeof c?.cloud_cover === "number" ? c.cloud_cover : undefined,
  };
}
