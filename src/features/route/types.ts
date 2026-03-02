export type LatLng = { lat: number; lng: number };

export type RouteRequest = {
  stops: [LatLng, LatLng, ...LatLng[]];
  profile: "pedestrian" | "bicycle" | "auto";
};

export type ValhallaRouteShape = {
  shape: string;
};

export type ValhallaRouteLeg = {
  shape: unknown;
  maneuvers?: unknown;
  summary?: {
    length?: number;
    time?: number;
  };
};

export type ValhallaRouteResponse = {
  trip?: {
    legs?: ValhallaRouteLeg[];
    summary?: {
      length?: number;
      time?: number;
    };
  };
};
