export interface Point {
  latitude: number;
  longitude: number;
}

/** Tashkent: where the map opens when there is no point yet. */
export const DEFAULT_CENTER: Point = {
  latitude: 41.311081,
  longitude: 69.240562,
};

const valid = (latitude: number, longitude: number): Point | null =>
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  Math.abs(latitude) <= 90 &&
  Math.abs(longitude) <= 180 &&
  !(latitude === 0 && longitude === 0)
    ? { latitude, longitude }
    : null;

const NUMBER = String.raw`(-?\d{1,3}(?:\.\d+)?)`;
const PAIR = new RegExp(`${NUMBER}\\s*,\\s*${NUMBER}`);

/** The first latitude,longitude pair after one of these markers in a link. */
function pairAfter(text: string, markers: readonly string[]) {
  for (const marker of markers) {
    const at = text.indexOf(marker);
    if (at === -1) continue;
    const match = PAIR.exec(text.slice(at + marker.length));
    if (match) return [Number(match[1]), Number(match[2])] as const;
  }
  return null;
}

/**
 * A point from what a customer sends: plain coordinates, a geo: link, or a Google or
 * Yandex Maps link. Yandex writes longitude first. Short links (goo.gl, yandex
 * .../-/...) hide the point, so they cannot be read here.
 */
export function parseLocation(input: string): Point | null {
  const text = decodeURIComponent(input.trim().replace(/\+/g, ' '));
  if (!text) return null;

  if (/yandex\.[a-z]+\/maps|yandex\.[a-z]+\/navi/i.test(text)) {
    // pt= marks the point; ll= is only the middle of the view.
    const pair = pairAfter(text, [
      'pt=',
      'whatshere[point]=',
      'rtext=~',
      'll=',
    ]);
    return pair && valid(pair[1], pair[0]);
  }
  if (/google\.[a-z.]+\/maps|maps\.google\./i.test(text)) {
    const pair = pairAfter(text, ['query=', 'destination=', 'q=', 'll=', '@']);
    return pair && valid(pair[0], pair[1]);
  }
  const pair = pairAfter(text, ['geo:', '']);
  return pair && valid(pair[0], pair[1]);
}

const fixed = (value: number) => value.toFixed(6);

/** Links that route a courier to the point, in the apps used here. */
export const mapLinks = ({ latitude, longitude }: Point) => {
  const lat = fixed(latitude);
  const lng = fixed(longitude);
  return {
    yandexMaps: `https://yandex.uz/maps/?rtext=~${lat},${lng}&rtt=auto`,
    yandexNavigator: `yandexnavi://build_route_on_map?lat_to=${lat}&lon_to=${lng}`,
    google: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
  };
};

export const formatPoint = ({ latitude, longitude }: Point) =>
  `${fixed(latitude)}, ${fixed(longitude)}`;
