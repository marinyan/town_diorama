import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const sourceName = process.argv[2] ?? 'kagurazaka';
const inputPath = resolve(`public/data/${sourceName}-osm.json`);
const outputDir = resolve(`public/data/${sourceName}-osm-chunks`);
const chunkSizeUnits = Number(process.argv[3] ?? 24);
const metersPerDegreeLat = 111_320;

function projectLonLat(lon, lat, center, metersPerUnit) {
  const metersPerDegreeLon = Math.cos((center.lat * Math.PI) / 180) * metersPerDegreeLat;
  return {
    x: ((lon - center.lon) * metersPerDegreeLon) / metersPerUnit,
    z: -((lat - center.lat) * metersPerDegreeLat) / metersPerUnit,
  };
}

function chunkIndex(value) {
  return Math.floor(value / chunkSizeUnits);
}

function chunkId(ix, iz) {
  return `${ix}_${iz}`;
}

const payload = JSON.parse(await readFile(inputPath, 'utf8'));
if (!payload.bbox || !payload.center) {
  throw new Error(`${inputPath} must contain bbox and center`);
}

const metersPerUnit = payload.metersPerUnit ?? 8;
const projectedBboxCorners = [
  projectLonLat(payload.bbox.west, payload.bbox.north, payload.center, metersPerUnit),
  projectLonLat(payload.bbox.east, payload.bbox.north, payload.center, metersPerUnit),
  projectLonLat(payload.bbox.west, payload.bbox.south, payload.center, metersPerUnit),
  projectLonLat(payload.bbox.east, payload.bbox.south, payload.center, metersPerUnit),
];
const worldBounds = {
  minX: Math.min(...projectedBboxCorners.map((point) => point.x)),
  maxX: Math.max(...projectedBboxCorners.map((point) => point.x)),
  minZ: Math.min(...projectedBboxCorners.map((point) => point.z)),
  maxZ: Math.max(...projectedBboxCorners.map((point) => point.z)),
};
const nodeById = new Map();
const ways = [];
for (const element of payload.elements ?? []) {
  if (element.type === 'node') nodeById.set(element.id, element);
  if (element.type === 'way') ways.push(element);
}

const chunks = new Map();
const ensureChunk = (ix, iz) => {
  const id = chunkId(ix, iz);
  let chunk = chunks.get(id);
  if (!chunk) {
    chunk = {
      id,
      ix,
      iz,
      bounds: {
        minX: ix * chunkSizeUnits,
        maxX: (ix + 1) * chunkSizeUnits,
        minZ: iz * chunkSizeUnits,
        maxZ: (iz + 1) * chunkSizeUnits,
      },
      nodeIds: new Set(),
      ways: [],
    };
    chunks.set(id, chunk);
  }
  return chunk;
};

for (const way of ways) {
  if (!way.nodes?.length) continue;
  const projected = way.nodes
    .map((id) => nodeById.get(id))
    .filter(Boolean)
    .map((node) => projectLonLat(node.lon, node.lat, payload.center, metersPerUnit));
  if (projected.length === 0) continue;

  const minX = Math.max(worldBounds.minX, Math.min(...projected.map((point) => point.x)));
  const maxX = Math.min(worldBounds.maxX, Math.max(...projected.map((point) => point.x)));
  const minZ = Math.max(worldBounds.minZ, Math.min(...projected.map((point) => point.z)));
  const maxZ = Math.min(worldBounds.maxZ, Math.max(...projected.map((point) => point.z)));
  if (minX > maxX || minZ > maxZ) continue;
  for (let ix = chunkIndex(minX); ix <= chunkIndex(maxX); ix++) {
    for (let iz = chunkIndex(minZ); iz <= chunkIndex(maxZ); iz++) {
      const chunk = ensureChunk(ix, iz);
      chunk.ways.push(way);
      way.nodes.forEach((id) => chunk.nodeIds.add(id));
    }
  }
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

const manifestChunks = [];
for (const chunk of [...chunks.values()].sort((a, b) => a.iz - b.iz || a.ix - b.ix)) {
  const nodes = [...chunk.nodeIds].map((id) => nodeById.get(id)).filter(Boolean);
  const elements = [...nodes, ...chunk.ways];
  const fileName = `${chunk.id}.json`;
  await writeFile(
    resolve(outputDir, fileName),
    JSON.stringify(
      {
        source: payload.source,
        fetchedAt: payload.fetchedAt,
        bbox: payload.bbox,
        center: payload.center,
        metersPerUnit,
        chunkId: chunk.id,
        bounds: chunk.bounds,
        elements,
      },
    ),
  );
  manifestChunks.push({
    id: chunk.id,
    path: fileName,
    bounds: chunk.bounds,
    elementCount: elements.length,
    wayCount: chunk.ways.length,
  });
}

await writeFile(
  resolve(outputDir, 'manifest.json'),
  JSON.stringify(
    {
      version: 1,
      sourceName,
      source: payload.source,
      fetchedAt: payload.fetchedAt,
      bbox: payload.bbox,
      center: payload.center,
      metersPerUnit,
      chunkSizeUnits,
      worldBounds,
      chunks: manifestChunks,
    },
    null,
    2,
  ),
);

await mkdir(dirname(inputPath), { recursive: true });
console.log(`Wrote ${manifestChunks.length} chunks to ${outputDir}`);
