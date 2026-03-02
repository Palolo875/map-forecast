export type LatLng = { lat: number; lng: number };

export type RouteRequest = {
  origin: LatLng;
  destination: LatLng;
  profile: "pedestrian" | "bicycle" | "auto";
};

export type ValhallaRouteShape = {
  shape: string;
};

export type ValhallaRouteLeg = {
  shape: string;
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
