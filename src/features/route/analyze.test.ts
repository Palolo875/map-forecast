import { describe, expect, it, vi } from "vitest";
import { analyzeRouteWeather, scoreRiskFromWeather } from "./analyze";
import { riskFromScore } from "./risk";

vi.mock("./weather", () => ({
  fetchHourlyWeatherAt: vi.fn().mockResolvedValue({
    timeIso: new Date(0).toISOString(),
    ts: 0,
    temperatureC: 10,
    windSpeedKmh: 30,
    precipitationMm: 1,
    weatherCode: 1,
    cloudCoverPct: 30,
  }),
}));

describe("scoreRiskFromWeather", () => {
  it("returns max for critical wind", () => {
    const score = scoreRiskFromWeather({ timeIso: "", ts: 0, windSpeedKmh: 90 });
    expect(score).toBe(100);
  });

  it("returns max for critical rain", () => {
    const score = scoreRiskFromWeather({ timeIso: "", ts: 0, precipitationMm: 20 });
    expect(score).toBe(100);
  });

  it("returns a bounded score for moderate values", () => {
    const score = scoreRiskFromWeather({ timeIso: "", ts: 0, precipitationMm: 2, windSpeedKmh: 35, weatherCode: 1 });
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });
});

describe("analyzeRouteWeather", () => {
  it("computes samples, segments, and global risk", async () => {
    const route = {
      line: {
        type: "LineString",
        coordinates: [
          [2.35, 48.85],
          [2.45, 48.9],
        ],
      },
      durationSec: 3600,
    };

    const analysis = await analyzeRouteWeather(route, Date.now(), 8);
    expect(analysis.samples.length).toBe(8);
    expect(analysis.segments.features.length).toBe(7);
    const expected = riskFromScore(analysis.samples.reduce((acc, s) => acc + s.risk.score, 0) / analysis.samples.length);
    expect(analysis.globalRisk.score).toBe(expected.score);
  });
});
