import type { Feature, FeatureCollection, Point } from "geojson";
import { bbox as turfBbox, distance as turfDistance, point as turfPoint } from "@turf/turf";

export type LngLat = { lng: number; lat: number };

export function pointFeature(pos: LngLat, properties?: Record<string, unknown>): Feature<Point> {
  return turfPoint([pos.lng, pos.lat], properties ?? {}) as Feature<Point>;
}

export function distanceKm(a: LngLat, b: LngLat) {
  return turfDistance([a.lng, a.lat], [b.lng, b.lat], { units: "kilometers" });
}

export function bboxFromPoints(points: LngLat[]): [number, number, number, number] | null {
  if (!points.length) return null;
  const fc: FeatureCollection<Point> = {
    type: "FeatureCollection",
    features: points.map((p) => pointFeature(p)),
  };
  return turfBbox(fc) as [number, number, number, number];
}
