import type { RoutingProvider, RoutingRequest } from "./RoutingProvider";
import type { RouteResult } from "../valhalla";
import { ensureOsrmBaseUrl, fetchJson } from "@/lib/api";

export function createOSRMAdapter(): RoutingProvider {
  return {
    id: "osrm",
    label: "OSRM",
    async getRoute(req: RoutingRequest) {
      const base = ensureOsrmBaseUrl();
      const profile = req.profile === "bicycle" ? "cycling" : req.profile === "pedestrian" ? "foot" : "driving";
      const coords = req.stops.map((s) => `${s.lng},${s.lat}`).join(";");
      const url = `${base}/route/v1/${profile}/${coords}?overview=full&geometries=geojson&steps=true`;

      type OsrmStep = { maneuver?: { instruction?: string }; distance?: number; duration?: number };
      type OsrmLeg = { steps?: OsrmStep[] };
      type OsrmRoute = {
        geometry?: GeoJSON.LineString;
        distance?: number;
        duration?: number;
        legs?: OsrmLeg[];
      };
      type OsrmResponse = { routes?: OsrmRoute[] };

      const data = await fetchJson<OsrmResponse>(url, "osrm");
      const route = data.routes?.[0];
      if (!route?.geometry) throw new Error("OSRM_NO_ROUTE");

      const maneuvers: RouteResult["maneuvers"] = [];
      route.legs?.forEach((leg) => {
        leg.steps?.forEach((step) => {
          maneuvers.push({
            index: maneuvers.length,
            instruction: step.maneuver?.instruction ?? "Continuer",
            distanceKm: typeof step.distance === "number" ? step.distance / 1000 : undefined,
            durationSec: typeof step.duration === "number" ? step.duration : undefined,
          });
        });
      });

      return {
        line: route.geometry,
        distanceKm: typeof route.distance === "number" ? route.distance / 1000 : undefined,
        durationSec: route.duration,
        maneuvers: maneuvers.length ? maneuvers : undefined,
      };
    },
  };
}
