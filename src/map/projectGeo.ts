import { Vector2 } from 'three';

export type GeoCenter = {
  lat: number;
  lon: number;
};

const metersPerDegreeLat = 111_320;

export function projectLonLat(lon: number, lat: number, center: GeoCenter, metersPerUnit = 8) {
  const metersPerDegreeLon = Math.cos((center.lat * Math.PI) / 180) * metersPerDegreeLat;
  const x = ((lon - center.lon) * metersPerDegreeLon) / metersPerUnit;
  const z = -((lat - center.lat) * metersPerDegreeLat) / metersPerUnit;
  return new Vector2(x, z);
}
