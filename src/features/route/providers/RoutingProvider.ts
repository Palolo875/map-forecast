import type { LatLng } from "../types";
import type { RouteResult } from "../valhalla";

export type RouteProfile = "auto" | "bicycle" | "pedestrian";

export type RoutingRequest = {
  stops: [LatLng, LatLng, ...LatLng[]];
  profile: RouteProfile;
};

export type RoutingErrorCode =
  | "PROVIDER_UNAVAILABLE"
  | "RATE_LIMITED"
  | "BAD_REQUEST"
  | "NO_ROUTE"
  | "NETWORK"
  | "UNKNOWN";

export type RoutingError = {
  code: RoutingErrorCode;
  message: string;
  retryable: boolean;
  details?: unknown;
};

export type RoutingProvider = {
  id: string;
  label: string;
  getRoute: (req: RoutingRequest) => Promise<RouteResult>;
};

export function toRoutingError(e: unknown): RoutingError {
  if (e instanceof Error) {
    const msg = e.message || "UNKNOWN";

    if (msg === "OSRM_NOT_CONFIGURED") return { code: "PROVIDER_UNAVAILABLE", message: msg, retryable: false };

    if (/^VALHALLA_429$/.test(msg)) return { code: "RATE_LIMITED", message: msg, retryable: true };
    if (/^VALHALLA_5\d\d$/.test(msg)) return { code: "PROVIDER_UNAVAILABLE", message: msg, retryable: true };
    if (/^VALHALLA_4\d\d$/.test(msg)) return { code: "BAD_REQUEST", message: msg, retryable: false };
    if (msg === "VALHALLA_NO_SHAPE") return { code: "NO_ROUTE", message: msg, retryable: false };
    if (/^OPEN_METEO_/.test(msg)) return { code: "NETWORK", message: msg, retryable: true };

    if (msg === "Failed to fetch") return { code: "NETWORK", message: msg, retryable: true };

    return { code: "UNKNOWN", message: msg, retryable: false };
  }

  return { code: "UNKNOWN", message: "UNKNOWN", retryable: false, details: e };
}

export function routingErrorLabel(err: RoutingError): string {
  if (err.code === "RATE_LIMITED") return "Service d’itinéraire saturé. Réessaie dans un instant.";
  if (err.code === "PROVIDER_UNAVAILABLE") return "Service d’itinéraire indisponible pour le moment.";
  if (err.code === "BAD_REQUEST") return "Impossible de calculer cet itinéraire avec ces paramètres.";
  if (err.code === "NO_ROUTE") return "Aucun itinéraire trouvé.";
  if (err.code === "NETWORK") return "Problème réseau. Vérifie ta connexion puis réessaie.";
  return "Erreur lors du calcul de l’itinéraire.";
}
