import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useRouteState } from "@/hooks/use-route-state";
import type { RoutingProvider } from "@/features/route/providers/RoutingProvider";

vi.mock("@/features/route/analyze", () => ({
  analyzeRouteWeather: vi.fn(async () => ({
    samples: [],
    segments: { type: "FeatureCollection", features: [] },
    globalRisk: { score: 0, level: "low" },
  })),
}));

const provider: RoutingProvider = {
  id: "mock",
  label: "Mock",
  async getRoute() {
    return {
      line: { type: "LineString", coordinates: [[2.35, 48.85], [2.36, 48.86]] },
      distanceKm: 1,
      durationSec: 120,
      maneuvers: [],
    };
  },
};

describe("useRouteState", () => {
  it("ajoute une étape via en fin de route", async () => {
    const { result } = renderHook(() => useRouteState(provider));

    act(() => {
      result.current.setRouteAddMode("via");
      result.current.applySelectionToStops({ lat: 48.85, lng: 2.35, name: "Paris" });
    });

    expect(result.current.routeStops).toHaveLength(1);

    act(() => {
      result.current.applySelectionToStops({ lat: 48.86, lng: 2.36, name: "Étape" });
    });

    await waitFor(() => {
      expect(result.current.routeStops).toHaveLength(2);
    });
  });

  it("remplace l’arrivée quand le mode est end", async () => {
    const { result } = renderHook(() => useRouteState(provider));

    act(() => {
      result.current.setRouteAddMode("end");
      result.current.applySelectionToStops({ lat: 48.85, lng: 2.35, name: "Départ" });
      result.current.applySelectionToStops({ lat: 48.86, lng: 2.36, name: "Arrivée A" });
    });

    await waitFor(() => {
      expect(result.current.routeStops[1]?.name).toBe("Arrivée A");
    });

    act(() => {
      result.current.applySelectionToStops({ lat: 48.87, lng: 2.37, name: "Arrivée B" });
    });

    await waitFor(() => {
      expect(result.current.routeStops[1]?.name).toBe("Arrivée B");
    });
  });
});
