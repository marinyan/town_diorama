import { Vector3 } from 'three';
import { BuildingData, CityLayout, CrowdPath, RoadData } from '../cityData';
import { createRandom } from '../random';
import { OsmNode, OsmPayload, OsmWay } from './osmTypes';
import { projectLonLat } from './projectGeo';

const fieldLimit = {
  x: 35.5,
  z: 30.5,
};

function isWay(element: { type: string }): element is OsmWay {
  return element.type === 'way';
}

function isInsideField(point: Vector3) {
  return Math.abs(point.x) <= fieldLimit.x && Math.abs(point.z) <= fieldLimit.z;
}

function isSegmentNearField(a: Vector3, b: Vector3) {
  return (
    Math.min(a.x, b.x) <= fieldLimit.x &&
    Math.max(a.x, b.x) >= -fieldLimit.x &&
    Math.min(a.z, b.z) <= fieldLimit.z &&
    Math.max(a.z, b.z) >= -fieldLimit.z
  );
}

function perpendicularDistance(point: { x: number; y: number }, start: { x: number; y: number }, end: { x: number; y: number }) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

function simplifyLine(points: Array<{ x: number; y: number }>, tolerance: number): Array<{ x: number; y: number }> {
  if (points.length <= 2) return points;
  const start = points[0];
  const end = points[points.length - 1];
  let maxDistance = 0;
  let splitIndex = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], start, end);
    if (distance > maxDistance) {
      maxDistance = distance;
      splitIndex = i;
    }
  }

  if (maxDistance <= tolerance) return [start, end];

  const left = simplifyLine(points.slice(0, splitIndex + 1), tolerance);
  const right = simplifyLine(points.slice(splitIndex), tolerance);
  return [...left.slice(0, -1), ...right];
}

function simplifyFootprint(points: Array<[number, number]>) {
  const open = points.slice();
  const last = open[open.length - 1];
  if (last && open.length > 1 && open[0][0] === last[0] && open[0][1] === last[1]) {
    open.pop();
  }
  if (open.length <= 18) return open;

  for (const tolerance of [0.05, 0.1, 0.18, 0.28]) {
    const simplified = simplifyLine(
      [...open, open[0]].map(([x, y]) => ({ x, y })),
      tolerance,
    )
      .slice(0, -1)
      .map((point): [number, number] => [point.x, point.y]);
    if (simplified.length >= 3 && simplified.length <= 18) return simplified;
  }

  return null;
}

function isNode(element: { type: string }): element is OsmNode {
  return element.type === 'node';
}

function parseHeight(tags: Record<string, string> | undefined, fallback: number) {
  if (!tags) return fallback;
  const height = tags.height?.replace(/[^\d.]/g, '');
  if (height) return Math.min(18, Math.max(1.8, Number(height) / 4));
  const levels = tags['building:levels'];
  if (levels) return Math.min(18, Math.max(1.8, Number(levels) * 0.85));
  return fallback;
}

function roadWidth(tags: Record<string, string> | undefined) {
  const highway = tags?.highway;
  if (highway === 'primary' || highway === 'secondary') return 1.1;
  if (highway === 'tertiary' || highway === 'unclassified') return 0.82;
  if (highway === 'footway' || highway === 'path' || highway === 'steps') return 0.34;
  return 0.58;
}

function roadKind(tags: Record<string, string> | undefined): RoadData['kind'] {
  const highway = tags?.highway;
  if (highway === 'primary' || highway === 'secondary' || highway === 'tertiary') return 'main';
  if (highway === 'footway' || highway === 'path' || highway === 'steps') return 'alley';
  return 'side';
}

export function createCityLayoutFromOsm(payload: OsmPayload, seed = 31415): CityLayout {
  const random = createRandom(seed);
  const nodes = new Map<number, OsmNode>();
  payload.elements.filter(isNode).forEach((node) => nodes.set(node.id, node));
  const bbox = payload.bbox;
  const center = bbox
    ? { lat: (bbox.south + bbox.north) / 2, lon: (bbox.west + bbox.east) / 2 }
    : { lat: 35.693, lon: 139.7025 };

  const ways = payload.elements.filter(isWay);
  const buildings: BuildingData[] = [];
  const roads: RoadData[] = [];
  const paths: CrowdPath[] = [];
  const doors: Vector3[] = [];

  for (const way of ways) {
    const points2 = way.nodes
      .map((id) => nodes.get(id))
      .filter((node): node is OsmNode => Boolean(node))
      .map((node) => projectLonLat(node.lon, node.lat, center));

    if (way.tags?.building && points2.length >= 3) {
      const xs = points2.map((point) => point.x);
      const zs = points2.map((point) => point.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minZ = Math.min(...zs);
      const maxZ = Math.max(...zs);
      const w = maxX - minX;
      const d = maxZ - minZ;
      if (w < 0.45 || d < 0.45 || w > 12 || d > 12) continue;
      const fallbackHeight = random.range(2.2, way.tags.building === 'apartments' || way.tags.building === 'commercial' ? 10 : 7);
      const h = parseHeight(way.tags, fallbackHeight);
      const x = (minX + maxX) / 2;
      const z = (minZ + maxZ) / 2;
      if (Math.abs(x) > fieldLimit.x || Math.abs(z) > fieldLimit.z) continue;
      const footprint = simplifyFootprint(points2.map((point) => [point.x - x, point.y - z]));
      if (!footprint) continue;
      buildings.push({
        id: `osm-building-${way.id}`,
        position: [x, h / 2, z],
        size: [Math.max(0.6, w), h, Math.max(0.6, d)],
        footprint,
        color: random.pick(['#687170', '#746f68', '#606971', '#76786f', '#5d6764']),
        roofColor: random.pick(['#3f4648', '#46413f', '#38424a', '#4a4a42']),
        signSides: random.chance(0.42) ? [random.pick(['north', 'south', 'east', 'west'])] : [],
        hasStairs: random.chance(0.28),
        windowSeed: random.int(10, 9000),
      });
      doors.push(new Vector3(x + random.range(-w / 3, w / 3), 0.09, z + d / 2 + 0.25));
      continue;
    }

    if (way.tags?.highway && points2.length >= 2) {
      const roadPoints = points2.map((point) => new Vector3(point.x, 0.035, point.y));
      if (!roadPoints.some(isInsideField) && !roadPoints.some((point, index) => index > 0 && isSegmentNearField(roadPoints[index - 1], point))) {
        continue;
      }
      const road: RoadData = {
        id: `osm-road-${way.id}`,
        points: roadPoints,
        width: roadWidth(way.tags),
        kind: roadKind(way.tags),
      };
      roads.push(road);
      if (roadPoints.length >= 3 && paths.length < 42) {
        paths.push({
          id: `osm-path-${way.id}`,
          zone: road.kind === 'main' ? 'commute' : road.kind === 'alley' ? 'nightlife' : 'scatter',
          points: roadPoints.map((position, index) => ({
            position: position.clone().setY(0.08),
            pause: index === 1 && random.chance(0.35) ? random.range(0.5, 1.6) : 0,
          })),
        });
      }
    }
  }

  if (paths.length === 0) {
    throw new Error('OSM payload did not contain usable road paths');
  }

  return { buildings, paths, roads, doors, source: 'osm' };
}
