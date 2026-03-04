export type ApiSource = "open-meteo" | "photon" | "valhalla" | "osrm";

const SOURCE_CODES: Record<ApiSource, string> = {
  "open-meteo": "OPEN_METEO",
  photon: "PHOTON",
  valhalla: "VALHALLA",
  osrm: "OSRM",
};

export class ApiError extends Error {
  source: ApiSource;
  status?: number;
  constructor(source: ApiSource, message: string, status?: number) {
    super(message);
    this.source = source;
    this.status = status;
  }
}

export const OPEN_METEO_BASE_URL = import.meta.env.VITE_OPEN_METEO_BASE_URL ?? "https://api.open-meteo.com";
export const PHOTON_BASE_URL = import.meta.env.VITE_PHOTON_BASE_URL ?? "https://photon.komoot.io";
export const VALHALLA_BASE_URL = import.meta.env.VITE_VALHALLA_BASE_URL ?? "https://valhalla1.openstreetmap.de";
export const OSRM_BASE_URL = import.meta.env.VITE_OSRM_BASE_URL ?? "";

function statusMessage(source: ApiSource, status?: number) {
  const code = SOURCE_CODES[source];
  if (typeof status === "number") return `${code}_${status}`;
  return `${code}_ERROR`;
}

export async function fetchJson<T>(url: string, source: ApiSource, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new ApiError(source, statusMessage(source, res.status), res.status);
  }
  return (await res.json()) as T;
}

export function formatApiError(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.source === "photon") return "Impossible de joindre le service de recherche.";
    if (error.source === "open-meteo") return "Impossible de charger la météo.";
    if (error.source === "valhalla") return "Impossible de calculer l’itinéraire.";
    if (error.source === "osrm") return "Impossible de calculer l’itinéraire.";
  }
  if (error instanceof Error && error.message === "Failed to fetch") {
    return "Problème réseau. Vérifie ta connexion puis réessaie.";
  }
  return fallback;
}

export function ensureOsrmBaseUrl() {
  if (!OSRM_BASE_URL) {
    throw new ApiError("osrm", "OSRM_NOT_CONFIGURED");
  }
  return OSRM_BASE_URL;
}
