import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const osmPath = resolve('public/data/shinjuku-osm.json');
const outputPath = resolve('public/data/shinjuku-elevation.json');
const zoom = 15;
const columns = 33;
const rows = 33;
const tileSources = ['dem5a', 'dem5b', 'dem'];

function lonLatToTile(lon, lat, z) {
  const n = 2 ** z;
  const latRad = (lat * Math.PI) / 180;
  return {
    x: Math.floor(((lon + 180) / 360) * n),
    y: Math.floor(((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n),
  };
}

function lonLatToPixel(lon, lat, z) {
  const n = 2 ** z;
  const latRad = (lat * Math.PI) / 180;
  const worldX = ((lon + 180) / 360) * n * 256;
  const worldY = ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n * 256;
  return {
    tileX: Math.floor(worldX / 256),
    tileY: Math.floor(worldY / 256),
    pixelX: Math.max(0, Math.min(255, Math.floor(worldX % 256))),
    pixelY: Math.max(0, Math.min(255, Math.floor(worldY % 256))),
  };
}

async function fetchTile(source, z, x, y) {
  const url = `https://cyberjapandata.gsi.go.jp/xyz/${source}/${z}/${x}/${y}.txt`;
  const response = await fetch(url, {
    headers: {
      'user-agent': 'just-watching-diorama/0.1 local elevation fetch',
    },
  });
  if (!response.ok) return undefined;
  const text = await response.text();
  const values = text.trim().split(/\r?\n/).map((line) =>
    line.split(',').map((value) => {
      if (value === 'e' || value === 'u' || value === '') return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }),
  );
  return { source, values };
}

const tileCache = new Map();

async function getTile(z, x, y) {
  const key = `${z}/${x}/${y}`;
  if (tileCache.has(key)) return tileCache.get(key);

  for (const source of tileSources) {
    const tile = await fetchTile(source, z, x, y);
    if (tile) {
      tileCache.set(key, tile);
      return tile;
    }
  }

  tileCache.set(key, undefined);
  return undefined;
}

async function sampleElevation(lat, lon) {
  const pixel = lonLatToPixel(lon, lat, zoom);
  const tile = await getTile(zoom, pixel.tileX, pixel.tileY);
  return tile?.values[pixel.pixelY]?.[pixel.pixelX];
}

const osm = JSON.parse(await readFile(osmPath, 'utf8'));
const bbox = osm.bbox;
if (!bbox) {
  throw new Error(`${osmPath} does not contain bbox`);
}

// Fetch the exact tiles up front so failures are visible before sampling.
const northWest = lonLatToTile(bbox.west, bbox.north, zoom);
const southEast = lonLatToTile(bbox.east, bbox.south, zoom);
for (let y = northWest.y; y <= southEast.y; y++) {
  for (let x = northWest.x; x <= southEast.x; x++) {
    await getTile(zoom, x, y);
  }
}

const rawValues = [];
for (let row = 0; row < rows; row++) {
  const lat = bbox.north - (row / (rows - 1)) * (bbox.north - bbox.south);
  for (let column = 0; column < columns; column++) {
    const lon = bbox.west + (column / (columns - 1)) * (bbox.east - bbox.west);
    rawValues.push(await sampleElevation(lat, lon));
  }
}

const validValues = rawValues.filter((value) => value !== undefined);
if (validValues.length === 0) {
  throw new Error('No usable GSI elevation samples were returned');
}

const baseMeters = Math.min(...validValues);
let lastValue = validValues[0];
const valuesMeters = rawValues.map((value) => {
  if (value !== undefined) lastValue = value;
  return Number((lastValue - baseMeters).toFixed(2));
});

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  JSON.stringify(
    {
      source: `GSI elevation tiles ${tileSources.join('/')} txt z${zoom}`,
      attribution: 'Elevation data: Geospatial Information Authority of Japan (GSI) elevation tiles',
      fetchedAt: new Date().toISOString(),
      bbox,
      center: {
        lat: (bbox.south + bbox.north) / 2,
        lon: (bbox.west + bbox.east) / 2,
      },
      rows,
      columns,
      baseMeters,
      valuesMeters,
    },
    null,
    2,
  ),
);

console.log(`Wrote ${outputPath}`);
console.log(`${validValues.length}/${rawValues.length} valid samples; base ${baseMeters.toFixed(2)}m; tiles ${tileCache.size}`);
