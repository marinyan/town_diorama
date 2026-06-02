import { ElevationGrid } from './elevationTypes';

const metersPerDegreeLat = 111_320;
export const verticalUnitsPerMeter = 0.16;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function sampleGrid(grid: ElevationGrid, lat: number, lon: number) {
  const u = clamp((lon - grid.bbox.west) / (grid.bbox.east - grid.bbox.west), 0, 1);
  const v = clamp((grid.bbox.north - lat) / (grid.bbox.north - grid.bbox.south), 0, 1);
  const x = u * (grid.columns - 1);
  const y = v * (grid.rows - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(grid.columns - 1, x0 + 1);
  const y1 = Math.min(grid.rows - 1, y0 + 1);
  const tx = x - x0;
  const ty = y - y0;
  const at = (column: number, row: number) => grid.valuesMeters[row * grid.columns + column] ?? 0;
  const top = at(x0, y0) * (1 - tx) + at(x1, y0) * tx;
  const bottom = at(x0, y1) * (1 - tx) + at(x1, y1) * tx;
  return top * (1 - ty) + bottom * ty;
}

export function sampleElevationUnits(grid: ElevationGrid | undefined, x: number, z: number) {
  if (!grid) return 0;
  const metersPerUnit = grid.metersPerUnit ?? 8;
  const metersPerDegreeLon = Math.cos((grid.center.lat * Math.PI) / 180) * metersPerDegreeLat;
  const lon = grid.center.lon + (x * metersPerUnit) / metersPerDegreeLon;
  const lat = grid.center.lat - (z * metersPerUnit) / metersPerDegreeLat;
  return sampleGrid(grid, lat, lon) * verticalUnitsPerMeter;
}
