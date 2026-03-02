import type { LatLng, RouteRequest, ValhallaRouteResponse } from "./types";

const VALHALLA_BASE_URL = "https://valhalla1.openstreetmap.de";

export type RouteManeuver = {
  index: number;
  instruction: string;
  distanceKm?: number;
  durationSec?: number;
};

export type RouteResult = {
  line: GeoJSON.LineString;
  distanceKm?: number;
  durationSec?: number;
  maneuvers?: RouteManeuver[];
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

function mergeLegCoordinates(legs: Array<{ shape: unknown }> | undefined): Array<[number, number]> | null {
  if (!legs?.length) return null;

  const merged: Array<[number, number]> = [];
  for (const leg of legs) {
    const shapeUnknown: unknown = leg?.shape;
    if (!isCoordsArray(shapeUnknown)) continue;

    const coords = shapeUnknown;
    if (!coords.length) continue;

    if (merged.length === 0) {
      merged.push(...coords);
      continue;
    }

    const last = merged[merged.length - 1];
    const first = coords[0];
    const startIndex = last && first && last[0] === first[0] && last[1] === first[1] ? 1 : 0;
    merged.push(...coords.slice(startIndex));
  }

  return merged.length ? merged : null;
}

function extractManeuvers(legs: Array<{ maneuvers?: unknown }> | undefined): RouteManeuver[] {
  const out: RouteManeuver[] = [];
  if (!legs?.length) return out;

  for (const leg of legs) {
    const msUnknown: unknown = leg?.maneuvers;
    if (!Array.isArray(msUnknown)) continue;

    for (const m of msUnknown) {
      if (!m || typeof m !== "object") continue;
      const mm = m as { instruction?: unknown; length?: unknown; time?: unknown };
      if (typeof mm.instruction !== "string" || !mm.instruction.trim()) continue;

      const lengthKm = typeof mm.length === "number" ? mm.length : undefined;
      const timeSec = typeof mm.time === "number" ? mm.time : undefined;

      out.push({
        index: out.length,
        instruction: mm.instruction,
        distanceKm: lengthKm,
        durationSec: timeSec,
      });
    }
  }

  return out;
}

export async function fetchRouteValhalla(req: RouteRequest): Promise<RouteResult> {
  const costing = normalizeProfile(req.profile);

  const body = {
    locations: req.stops.map(toValhallaLocation),
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

  const coords = mergeLegCoordinates((data.trip?.legs as Array<{ shape: unknown }> | undefined) ?? undefined);
  if (!coords) throw new Error("VALHALLA_NO_SHAPE");

  const line: GeoJSON.LineString = {
    type: "LineString",
    coordinates: coords,
  };

  const maneuvers = extractManeuvers((data.trip?.legs as Array<{ maneuvers?: unknown }> | undefined) ?? undefined);

  const distanceKm = data.trip?.summary?.length;
  const durationSec = data.trip?.summary?.time;

  return { line, distanceKm, durationSec, maneuvers };
}
