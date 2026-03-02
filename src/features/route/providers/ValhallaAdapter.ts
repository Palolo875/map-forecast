import type { RoutingProvider, RoutingRequest } from "./RoutingProvider";
import { fetchRouteValhalla } from "../valhalla";

export function createValhallaAdapter(): RoutingProvider {
  return {
    id: "valhalla",
    label: "Valhalla",
    async getRoute(req: RoutingRequest) {
      return fetchRouteValhalla({
        stops: req.stops,
        profile: req.profile,
      });
    },
  };
}
