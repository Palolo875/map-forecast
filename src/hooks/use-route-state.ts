import { useCallback, useRef, useState } from "react";
import type { RouteResult } from "@/features/route/valhalla";
import { analyzeRouteWeather } from "@/features/route/analyze";
import type { RouteAnalysis } from "@/features/route/analyze";
import type { RouteRequest } from "@/features/route/types";
import type { RoutingProvider } from "@/features/route/providers/RoutingProvider";
import { routingErrorLabel, toRoutingError } from "@/features/route/providers/RoutingProvider";

export type RouteStop = { lat: number; lng: number; name: string };

export type RouteState = {
  routeStops: RouteStop[];
  routeAddMode: "start" | "via" | "end";
  routeProfile: RouteRequest["profile"];
  routeStatus: "idle" | "loading" | "error" | "ready";
  routeError?: string;
  route: RouteResult | null;
  routeAnalysis: RouteAnalysis | null;
  departureTs: number;
  requestRoute: (stops: RouteStop[], profile: RouteRequest["profile"]) => void;
  updateStops: (nextStops: RouteStop[]) => void;
  applySelectionToStops: (sel: RouteStop) => void;
  onRouteProfileChange: (next: RouteRequest["profile"]) => void;
  setRouteAddMode: (next: "start" | "via" | "end") => void;
  clearRoute: () => void;
  removeRouteStop: (index: number) => void;
  moveRouteStop: (index: number, dir: -1 | 1) => void;
  simulateDeparture: (nextDepartureTs: number) => void;
};

export function useRouteState(routingProvider: RoutingProvider): RouteState {
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [routeAddMode, setRouteAddMode] = useState<"start" | "via" | "end">("end");
  const [routeProfile, setRouteProfile] = useState<RouteRequest["profile"]>("auto");
  const [routeStatus, setRouteStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [routeError, setRouteError] = useState<string | undefined>(undefined);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeAnalysis, setRouteAnalysis] = useState<RouteAnalysis | null>(null);
  const [departureTs, setDepartureTs] = useState<number>(() => Date.now());
  const analysisTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const requestRoute = useCallback(
    (stops: RouteStop[], profile: RouteRequest["profile"]) => {
      if (stops.length < 2) {
        setRouteStatus("idle");
        setRouteError(undefined);
        setRoute(null);
        setRouteAnalysis(null);
        return;
      }

      const origin = { lat: stops[0].lat, lng: stops[0].lng };
      const destination = { lat: stops[1].lat, lng: stops[1].lng };
      const rest = stops.slice(2).map((s) => ({ lat: s.lat, lng: s.lng }));
      const latLngStops: RouteRequest["stops"] = [origin, destination, ...rest];

      setRouteStatus("loading");
      setRouteError(undefined);
      setRouteAnalysis(null);

      routingProvider
        .getRoute({
          stops: latLngStops,
          profile,
        })
        .then(async (r) => {
          setRoute(r);

          const baseDeparture = Date.now();
          setDepartureTs(baseDeparture);
          const analysis = await analyzeRouteWeather(r, baseDeparture, 12);
          setRouteAnalysis(analysis);
          setRouteStatus("ready");
        })
        .catch((e) => {
          const err = toRoutingError(e);
          setRoute(null);
          setRouteAnalysis(null);
          setRouteStatus("error");
          setRouteError(routingErrorLabel(err));
        });
    },
    [routingProvider],
  );

  const updateStops = useCallback(
    (nextStops: RouteStop[]) => {
      setRouteStops(nextStops);
      requestRoute(nextStops, routeProfile);
    },
    [requestRoute, routeProfile],
  );

  const applySelectionToStops = useCallback(
    (sel: RouteStop) => {
      if (routeAddMode === "via") {
        updateStops([...routeStops, sel]);
        return;
      }

      if (routeAddMode === "start") {
        if (routeStops.length === 0) {
          updateStops([sel]);
          return;
        }
        const next = [sel, ...routeStops.slice(1)];
        updateStops(next);
        return;
      }

      if (routeStops.length === 0) {
        updateStops([sel]);
        return;
      }
      if (routeStops.length === 1) {
        updateStops([routeStops[0], sel]);
        return;
      }
      const next = [...routeStops];
      next[next.length - 1] = sel;
      updateStops(next);
    },
    [routeAddMode, routeStops, updateStops],
  );

  const onRouteProfileChange = useCallback(
    (next: RouteRequest["profile"]) => {
      setRouteProfile(next);
      requestRoute(routeStops, next);
    },
    [requestRoute, routeStops],
  );

  const clearRoute = useCallback(() => {
    setRouteStops([]);
    setRouteStatus("idle");
    setRouteError(undefined);
    setRoute(null);
    setRouteAnalysis(null);
  }, []);

  const removeRouteStop = useCallback(
    (index: number) => {
      const next = routeStops.filter((_, i) => i !== index);
      updateStops(next);
    },
    [routeStops, updateStops],
  );

  const moveRouteStop = useCallback(
    (index: number, dir: -1 | 1) => {
      const nextIndex = index + dir;
      if (nextIndex < 0 || nextIndex >= routeStops.length) return;
      const next = [...routeStops];
      const tmp = next[index];
      next[index] = next[nextIndex];
      next[nextIndex] = tmp;
      updateStops(next);
    },
    [routeStops, updateStops],
  );

  const simulateDeparture = useCallback(
    (nextDepartureTs: number) => {
      if (!route) {
        setDepartureTs(nextDepartureTs);
        return;
      }

      setDepartureTs(nextDepartureTs);
      if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current);

      analysisTimerRef.current = setTimeout(() => {
        setRouteStatus("loading");
        analyzeRouteWeather(route, nextDepartureTs, 12)
          .then((analysis) => {
            setRouteAnalysis(analysis);
            setRouteStatus("ready");
          })
          .catch((e) => {
            setRouteAnalysis(null);
            setRouteStatus("error");
            setRouteError(e instanceof Error ? e.message : "ROUTE_ANALYSIS_ERROR");
          });
      }, 250);
    },
    [route],
  );

  return {
    routeStops,
    routeAddMode,
    routeProfile,
    routeStatus,
    routeError,
    route,
    routeAnalysis,
    departureTs,
    requestRoute,
    updateStops,
    applySelectionToStops,
    onRouteProfileChange,
    setRouteAddMode,
    clearRoute,
    removeRouteStop,
    moveRouteStop,
    simulateDeparture,
  };
}
