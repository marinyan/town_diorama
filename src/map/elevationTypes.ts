export type ElevationGrid = {
  source: string;
  attribution: string;
  fetchedAt: string;
  bbox: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
  center: {
    lat: number;
    lon: number;
  };
  rows: number;
  columns: number;
  baseMeters: number;
  valuesMeters: number[];
};
