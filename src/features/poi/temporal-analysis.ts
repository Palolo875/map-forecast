import type { PoiVisit, CurrentWeatherSnapshot } from "./types";

export interface TemporalAnalysis {
  severity: "low" | "medium" | "high";
  message: string;
  trend: "improving" | "worsening" | "stable";
  diff: {
    temp: number;
    wind: number;
    precip: number;
  };
}

export function analyzeTemporalShift(
  pastVisit: PoiVisit,
  currentWeather: CurrentWeatherSnapshot
): TemporalAnalysis | null {
  const past = pastVisit.weatherSnapshot;
  if (!past) return null;

  const tempDiff = currentWeather.temperatureC - (past.temperatureC ?? currentWeather.temperatureC);
  const windDiff = currentWeather.windSpeedKmh - (past.windSpeedKmh ?? currentWeather.windSpeedKmh);
  const precipDiff = (currentWeather.precipitationMm || 0) - (past.precipitationMm || 0);

  let severity: TemporalAnalysis["severity"] = "low";
  let message = "Conditions similaires à votre dernière visite.";
  let trend: TemporalAnalysis["trend"] = "stable";

  // Logic for worsening conditions
  if (windDiff > 20 || precipDiff > 2 || tempDiff < -10) {
    severity = "high";
    message = "Conditions nettement plus hostiles qu'en " + new Date(pastVisit.visitedAt).getFullYear();
    trend = "worsening";
  } else if (windDiff > 10 || precipDiff > 0.5 || tempDiff < -5) {
    severity = "medium";
    message = "Conditions plus rudes que lors de votre dernier passage.";
    trend = "worsening";
  } else if (tempDiff > 5 && windDiff < -5 && precipDiff <= 0) {
    trend = "improving";
    message = "Conditions plus clémentes qu'auparavant.";
  }

  return {
    severity,
    message,
    trend,
    diff: {
      temp: tempDiff,
      wind: windDiff,
      precip: precipDiff,
    },
  };
}
