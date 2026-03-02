import type { RoutingProvider, RoutingRequest } from "./RoutingProvider";

export function createOSRMAdapter(): RoutingProvider {
  return {
    id: "osrm",
    label: "OSRM",
    async getRoute(_req: RoutingRequest) {
      throw new Error("OSRM_NOT_CONFIGURED");
    },
  };
}
