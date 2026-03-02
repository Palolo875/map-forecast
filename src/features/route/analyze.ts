import { along, length, lineString } from "@turf/turf";
import type { Feature, FeatureCollection, LineString, Point } from "geojson";
import type { RouteResult } from "./valhalla";
import { fetchHourlyWeatherAt, type HourlyWeatherPoint } from "./weather";
import { riskFromScore, type RiskLevel } from "./risk";

export type RouteSamplePoint = {
  index: number;
  progress01: number;
  position: { lat: number; lng: number };
  etaTs: number;
  weather: HourlyWeatherPoint;
  risk: { score: number; level: RiskLevel };
};

export type RouteAnalysis = {
  samples: RouteSamplePoint[];
  segments: FeatureCollection<LineString, { color: string; riskScore: number; riskLevel: RiskLevel; t0: number; t1: number }>;
  globalRisk: { score: number; level: RiskLevel };
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function colorForRisk(level: RiskLevel) {
  if (level === "low") return "#22C55E";
  if (level === "medium") return "#F59E0B";
  if (level === "high") return "#F97316";
  return "#EF4444";
}

export function scoreRiskFromWeather(w: HourlyWeatherPoint) {
  // Simple V1 heuristic, extensible later.
  const rain = w.precipitationMm ?? 0;
  const wind = w.windSpeedKmh ?? 0;
  const code = w.weatherCode ?? 0;

  // Critical thresholds: if exceeded, the situation is considered max risk.
  // Keep conservative defaults to avoid false positives while still handling extreme conditions.
  const criticalWindKmh = 80;
  const criticalRainMmPerH = 12;
  const isStorm = code >= 95;

  if (wind >= criticalWindKmh) return 100;
  if (rain >= criticalRainMmPerH) return 100;
  if (isStorm && (wind >= 70 || rain >= 6)) return 100;

  const rainScore = clamp((rain / 6) * 60, 0, 60); // 6mm/h => 60pts
  const windScore = clamp(((wind - 20) / 60) * 35, 0, 35); // 20->80km/h => 0->35pts
  const stormBonus = isStorm ? 20 : 0;

  return clamp(rainScore + windScore + stormBonus, 0, 100);
}

export async function analyzeRouteWeather(route: RouteResult, departureTs: number, sampleCount = 12): Promise<RouteAnalysis> {
  const coords = route.line.coordinates as Array<[number, number]>;
  const line = lineString(coords);
  const distKm = length(line, { units: "kilometers" });

  const durationSec = route.durationSec ?? Math.max(60, Math.round((distKm / 70) * 3600));

  const N = Math.max(6, Math.min(36, Math.round(sampleCount)));
  const samples: RouteSamplePoint[] = [];

  for (let i = 0; i < N; i += 1) {
    const progress01 = N === 1 ? 0 : i / (N - 1);
    const d = distKm * progress01;
    const p = along(line, d, { units: "kilometers" }) as Feature<Point>;
    const lng = p.geometry.coordinates[0];
    const lat = p.geometry.coordinates[1];

    const etaTs = departureTs + Math.round(durationSec * progress01) * 1000;
    const weather = await fetchHourlyWeatherAt(lat, lng, etaTs);
    const score = scoreRiskFromWeather(weather);
    const risk = riskFromScore(score);

    samples.push({
      index: i,
      progress01,
      position: { lat, lng },
      etaTs,
      weather,
      risk,
    });
  }

  const segmentFeatures: Array<Feature<LineString, { color: string; riskScore: number; riskLevel: RiskLevel; t0: number; t1: number }>> = [];
  for (let i = 0; i < samples.length - 1; i += 1) {
    const a = samples[i];
    const b = samples[i + 1];
    const score = Math.round((a.risk.score + b.risk.score) / 2);
    const risk = riskFromScore(score);

    const seg: Feature<LineString, { color: string; riskScore: number; riskLevel: RiskLevel; t0: number; t1: number }> = {
      type: "Feature",
      properties: {
        color: colorForRisk(risk.level),
        riskScore: risk.score,
        riskLevel: risk.level,
        t0: a.etaTs,
        t1: b.etaTs,
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [a.position.lng, a.position.lat],
          [b.position.lng, b.position.lat],
        ],
      },
    };
    segmentFeatures.push(seg);
  }

  const global = riskFromScore(Math.round(samples.reduce((acc, s) => acc + s.risk.score, 0) / Math.max(1, samples.length)));

  return {
    samples,
    segments: {
      type: "FeatureCollection",
      features: segmentFeatures,
    },
    globalRisk: global,
  };
}
