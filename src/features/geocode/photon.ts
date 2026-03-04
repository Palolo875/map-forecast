export type PhotonFeatureProperties = {
  name?: string;
  city?: string;
  state?: string;
  country?: string;
};

export type PhotonFeature = {
  properties?: PhotonFeatureProperties;
  geometry?: { coordinates?: [number, number] };
};

export type PhotonResponse = {
  features?: PhotonFeature[];
};

export type PhotonReverseFeature = {
  properties?: { name?: string; city?: string; country?: string };
};

export type PhotonReverseResponse = {
  features?: PhotonReverseFeature[];
};
