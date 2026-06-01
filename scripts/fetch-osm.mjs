import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const bbox = {
  south: 35.6915,
  west: 139.7005,
  north: 35.6945,
  east: 139.7045,
};

const outputPath = resolve('public/data/shinjuku-osm.json');

const query = `
[out:json][timeout:30];
(
  way["building"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  relation["building"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  way["highway"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
);
out body;
>;
out skel qt;
`;

const response = await fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  headers: {
    'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
    'user-agent': 'just-watching-diorama/0.1 local data fetch',
  },
  body: new URLSearchParams({ data: query }),
});

if (!response.ok) {
  throw new Error(`Overpass request failed: ${response.status} ${response.statusText}`);
}

const data = await response.json();
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  JSON.stringify(
    {
      fetchedAt: new Date().toISOString(),
      source: 'OpenStreetMap via Overpass API',
      bbox,
      ...data,
    },
    null,
    2,
  ),
);

console.log(`Wrote ${outputPath}`);
console.log(`${data.elements?.length ?? 0} OSM elements`);
