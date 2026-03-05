import type { CurrentWeatherSnapshot } from "./weather";
import type { IdealWeather } from "./types";

type IdealMatchResult = {
  score: number;
  status: "good" | "ok" | "bad";
  breakdown: {
    temperature?: number;
    wind?: number;
    precipitation?: number;
    cloudCover?: number;
  };
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function scoreMax(value: number | undefined, max: number | undefined) {
  if (max === undefined) return 1;
  if (value === undefined) return 0.7;
  if (value <= max) return 1;
  const over = value - max;
  const normalized = clamp(1 - over / Math.max(1, max), 0, 1);
  return normalized * normalized;
}

function scoreRange(value: number | undefined, min: number | undefined, max: number | undefined) {
  if (min === undefined && max === undefined) return 1;
  if (value === undefined) return 0.7;

  if (min !== undefined && value < min) {
    const under = min - value;
    const normalized = clamp(1 - under / Math.max(1, Math.abs(min)), 0, 1);
    return normalized * normalized;
  }
  if (max !== undefined && value > max) {
    const over = value - max;
    const normalized = clamp(1 - over / Math.max(1, Math.abs(max)), 0, 1);
    return normalized * normalized;
  }
  return 1;
}

export function computeIdealMatchScore(ideal: IdealWeather | undefined, current: CurrentWeatherSnapshot | null): IdealMatchResult | null {
  if (!ideal) return null;
  if (!current) return {
    score: 50,
    status: "ok",
    breakdown: {},
  };

  const sTemp = scoreRange(current.temperatureC, ideal.tempMinC, ideal.tempMaxC);
  const sWind = scoreMax(current.windSpeedKmh, ideal.windMaxKmh);
  const sRain = scoreMax(current.precipitationMm, ideal.precipitationMaxMm);
  const sCloud = scoreMax(current.cloudCoverPct, ideal.cloudCoverMaxPct);

  const weights = {
    temp: 0.35,
    wind: 0.30,
    rain: 0.25,
    cloud: 0.10,
  };

  const score01 =
    sTemp * weights.temp +
    sWind * weights.wind +
    sRain * weights.rain +
    sCloud * weights.cloud;

  const score = Math.round(clamp(score01, 0, 1) * 100);
  const status = score >= 80 ? "good" : score >= 50 ? "ok" : "bad";

  return {
    score,
    status,
    breakdown: {
      temperature: Math.round(sTemp * 100),
      wind: Math.round(sWind * 100),
      precipitation: Math.round(sRain * 100),
      cloudCover: Math.round(sCloud * 100),
    },
  };
}
