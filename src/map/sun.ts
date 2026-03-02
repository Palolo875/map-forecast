type SunTimes = { sunrise: Date; sunset: Date };

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number) {
  return (rad * 180) / Math.PI;
}

function normalizeDeg(d: number) {
  const r = d % 360;
  return r < 0 ? r + 360 : r;
}

// NOAA-inspired approximation good enough for UI day/night switching.
export function computeSunTimes(date: Date, lat: number, lng: number): SunTimes {
  const dayStartUtc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const N = Math.floor((dayStartUtc - Date.UTC(date.getUTCFullYear(), 0, 0)) / 86400000);

  const lngHour = lng / 15;

  function compute(isSunrise: boolean) {
    const t = N + ((isSunrise ? 6 : 18) - lngHour) / 24;

    const M = normalizeDeg(0.9856 * t - 3.289);

    let L = M + 1.916 * Math.sin(toRad(M)) + 0.020 * Math.sin(toRad(2 * M)) + 282.634;
    L = normalizeDeg(L);

    let RA = toDeg(Math.atan(0.91764 * Math.tan(toRad(L))));
    RA = normalizeDeg(RA);

    const Lquadrant = Math.floor(L / 90) * 90;
    const RAquadrant = Math.floor(RA / 90) * 90;
    RA = RA + (Lquadrant - RAquadrant);
    RA = RA / 15;

    const sinDec = 0.39782 * Math.sin(toRad(L));
    const cosDec = Math.cos(Math.asin(sinDec));

    const zenith = 90.833;
    const cosH = (Math.cos(toRad(zenith)) - sinDec * Math.sin(toRad(lat))) / (cosDec * Math.cos(toRad(lat)));

    const safeCosH = clamp(cosH, -1, 1);
    let H = isSunrise ? 360 - toDeg(Math.acos(safeCosH)) : toDeg(Math.acos(safeCosH));
    H = H / 15;

    const T = H + RA - 0.06571 * t - 6.622;

    const UT = normalizeDeg((T - lngHour) * 15) / 15;

    return UT;
  }

  const sunriseUT = compute(true);
  const sunsetUT = compute(false);

  const sunrise = new Date(dayStartUtc + sunriseUT * 3600000);
  const sunset = new Date(dayStartUtc + sunsetUT * 3600000);

  return { sunrise, sunset };
}
