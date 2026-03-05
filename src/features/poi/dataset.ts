import type { Poi } from "./types";

const now = Date.now();

export const POI_DATASET: Poi[] = [
  {
    id: "poi_refuge_01",
    type: "refuge",
    source: "dataset",
    name: "Refuge (exemple) — Massif",
    position: { lat: 45.923, lng: 6.869 },
    meta: { altitudeM: 2100 },
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "poi_shelter_01",
    type: "emergency_shelter",
    source: "dataset",
    name: "Abri d'urgence (exemple)",
    position: { lat: 45.905, lng: 6.852 },
    meta: { capacity: 6 },
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "poi_station_01",
    type: "weather_station",
    source: "dataset",
    name: "Station météo (exemple)",
    position: { lat: 45.914, lng: 6.893 },
    meta: { provider: "auto" },
    createdAt: now,
    updatedAt: now,
  },
];
