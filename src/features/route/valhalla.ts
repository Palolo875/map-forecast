import type { LatLng, RouteRequest, ValhallaRouteResponse } from "./types";

const VALHALLA_BASE_URL = "https://valhalla1.openstreetmap.de";

export type RouteResult = {
  line: GeoJSON.LineString;
  distanceKm?: number;
  durationSec?: number;
};

function isCoordTuple(v: unknown): v is [number, number] {
  return Array.isArray(v) && v.length === 2 && typeof v[0] === "number" && typeof v[1] === "number";
}

function isCoordsArray(v: unknown): v is Array<[number, number]> {
  return Array.isArray(v) && v.every(isCoordTuple);
}

function normalizeProfile(profile: RouteRequest["profile"]) {
  if (profile === "pedestrian") return "pedestrian";
  if (profile === "bicycle") return "bicycle";
  return "auto";
}

function toValhallaLocation(p: LatLng) {
  return { lat: p.lat, lon: p.lng };
}

export async function fetchRouteValhalla(req: RouteRequest): Promise<RouteResult> {
  const costing = normalizeProfile(req.profile);

  const body = {
    locations: [toValhallaLocation(req.origin), toValhallaLocation(req.destination)],
    costing,
    directions_options: { units: "kilometers" },
    shape_format: "geojson",
  };

  const res = await fetch(`${VALHALLA_BASE_URL}/route`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`VALHALLA_${res.status}`);
  }

  const data = (await res.json()) as ValhallaRouteResponse;
  const leg = data.trip?.legs?.[0];

  const shapeUnknown: unknown = leg ? (leg as { shape?: unknown }).shape : undefined;
  if (!leg || !isCoordsArray(shapeUnknown)) {
    throw new Error("VALHALLA_NO_SHAPE");
  }

  const coords = shapeUnknown;
  const line: GeoJSON.LineString = {
    type: "LineString",
    coordinates: coords,
  };

  const distanceKm = data.trip?.summary?.length ?? leg.summary?.length;
  const durationSec = data.trip?.summary?.time ?? leg.summary?.time;

  return { line, distanceKm, durationSec };
}
