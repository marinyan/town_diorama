import { Vector3 } from 'three';
import { BuildingData, CityLayout, CrowdPath, RoadData, WaterData } from '../cityData';
import { createRandom } from '../random';
import { sampleElevationUnits } from './elevationSampler';
import { ElevationGrid } from './elevationTypes';
import { OsmNode, OsmPayload, OsmWay } from './osmTypes';
import { projectLonLat } from './projectGeo';

const fieldLimit = {
  x: 35.5,
  z: 30.5,
};

type PathCandidate = {
  path: CrowdPath;
  score: number;
  tieBreak: number;
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
  if (height) return Math.min(9.5, Math.max(1.4, Number(height) / 6.2));
  const levels = tags['building:levels'];
  if (levels) return Math.min(9.5, Math.max(1.4, Number(levels) * 0.58));
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

function waterKind(tags: Record<string, string> | undefined): WaterData['kind'] {
  if (tags?.waterway === 'canal' || tags?.water === 'canal') return 'canal';
  if (tags?.waterway === 'stream') return 'stream';
  if (tags?.natural === 'water') return 'basin';
  return 'river';
}

function waterWidth(tags: Record<string, string> | undefined) {
  const width = Number(tags?.width?.replace(/[^\d.]/g, ''));
  if (Number.isFinite(width) && width > 0) return Math.min(5, Math.max(0.55, width / 8));
  if (tags?.waterway === 'stream') return 0.55;
  if (tags?.waterway === 'canal') return 1.15;
  if (tags?.natural === 'water') return 1.8;
  return 2.2;
}

function parseLayer(tags: Record<string, string> | undefined) {
  const parsed = Number(tags?.layer ?? 0);
  return Number.isFinite(parsed) ? Math.max(-2, Math.min(3, parsed)) : 0;
}

function hasTruthyTag(value: string | undefined) {
  return value === 'yes' || value === 'true' || value === '1';
}

function roadElevation(tags: Record<string, string> | undefined) {
  if (!tags) return 0;
  const layer = parseLayer(tags);
  const highway = tags.highway;
  const isSteps = highway === 'steps';
  const isBridge = hasTruthyTag(tags.bridge);
  const isTunnel = hasTruthyTag(tags.tunnel) || tags.covered === 'yes';
  const incline = tags.incline;

  let elevation = layer * 0.32;
  if (isBridge) elevation += 0.72;
  if (isTunnel) elevation -= 0.18;
  if (isSteps) elevation += 0.28;
  if (incline === 'up') elevation += 0.2;
  if (incline === 'down') elevation -= 0.12;

  return Math.max(-0.18, Math.min(1.45, elevation));
}

function pathLength(points: Vector3[]) {
  let length = 0;
  for (let index = 1; index < points.length; index++) {
    length += points[index - 1].distanceTo(points[index]);
  }
  return length;
}

function pathScore(tags: Record<string, string> | undefined, road: RoadData, length: number) {
  const highway = tags?.highway;
  const pedestrianKinds = ['footway', 'path', 'steps', 'pedestrian', 'living_street', 'service'];
  const vehicleKinds = ['primary', 'secondary', 'tertiary'];
  let score = 0;

  if (pedestrianKinds.includes(highway ?? '')) score += 7;
  if (road.kind === 'alley') score += 4;
  if (road.hasSteps) score += 5;
  if (tags?.sidewalk === 'both' || tags?.sidewalk === 'left' || tags?.sidewalk === 'right') score += 2;
  if (tags?.tunnel || tags?.bridge || tags?.layer) score += 1.5;
  if (vehicleKinds.includes(highway ?? '')) score -= 3;

  score += Math.min(5, length * 0.25);
  if (length < 1.1) score -= 4;
  if (length > 24) score -= 1.5;

  return score;
}

function createRoadPath(id: string, road: RoadData, random: ReturnType<typeof createRandom>): CrowdPath | undefined {
  const visiblePoints = road.points.filter(isInsideField);
  const sourcePoints = visiblePoints.length >= 2 ? visiblePoints : road.points;
  if (sourcePoints.length < 2) return undefined;
  const forward = sourcePoints.map((position, index) => ({
    position: position.clone().setY(position.y + 0.045),
    pause: index === 1 && random.chance(0.28) ? random.range(0.4, 1.4) : 0,
  }));
  const reverse = forward
    .slice(1, -1)
    .reverse()
    .map((point) => ({ ...point, position: point.position.clone(), pause: 0 }));

  return {
    id,
    zone: road.kind === 'main' ? 'commute' : road.kind === 'alley' ? 'nightlife' : 'scatter',
    points: [...forward, ...reverse],
  };
}

export function createCityLayoutFromOsm(payload: OsmPayload, seed = 31415, elevationGrid?: ElevationGrid): CityLayout {
  const random = createRandom(seed);
  const nodes = new Map<number, OsmNode>();
  payload.elements.filter(isNode).forEach((node) => nodes.set(node.id, node));
  const bbox = payload.bbox;
  const center = bbox
    ? payload.center ?? { lat: (bbox.south + bbox.north) / 2, lon: (bbox.west + bbox.east) / 2 }
    : { lat: 35.693, lon: 139.7025 };
  const metersPerUnit = payload.metersPerUnit ?? 8;

  const ways = payload.elements.filter(isWay);
  const buildings: BuildingData[] = [];
  const roads: RoadData[] = [];
  const waters: WaterData[] = [];
  const paths: CrowdPath[] = [];
  const pathCandidates: PathCandidate[] = [];
  const doors: Vector3[] = [];

  for (const way of ways) {
    const points2 = way.nodes
      .map((id) => nodes.get(id))
      .filter((node): node is OsmNode => Boolean(node))
      .map((node) => projectLonLat(node.lon, node.lat, center, metersPerUnit));

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
      const fallbackHeight = random.range(1.7, way.tags.building === 'apartments' || way.tags.building === 'commercial' ? 5.8 : 4.6);
      const h = parseHeight(way.tags, fallbackHeight);
      const x = (minX + maxX) / 2;
      const z = (minZ + maxZ) / 2;
      const groundY = sampleElevationUnits(elevationGrid, x, z);
      if (Math.abs(x) > fieldLimit.x || Math.abs(z) > fieldLimit.z) continue;
      const footprint = simplifyFootprint(points2.map((point) => [point.x - x, point.y - z]));
      if (!footprint) continue;
      buildings.push({
        id: `osm-building-${way.id}`,
        position: [x, groundY + h / 2, z],
        size: [Math.max(0.6, w), h, Math.max(0.6, d)],
        footprint,
        color: random.pick(['#687170', '#746f68', '#606971', '#76786f', '#5d6764']),
        roofColor: random.pick(['#3f4648', '#46413f', '#38424a', '#4a4a42']),
        roofStyle: h <= 4.9 && random.chance(0.76) ? 'gable' : 'flat',
        roofAxis: w >= d ? 'x' : 'z',
        signSides: h > 4.4 && random.chance(0.16) ? [random.pick(['north', 'south', 'east', 'west'])] : [],
        hasStairs: random.chance(0.28),
        windowSeed: random.int(10, 9000),
      });
      doors.push(new Vector3(x + random.range(-w / 3, w / 3), groundY + 0.09, z + d / 2 + 0.25));
      continue;
    }

    if (way.tags?.highway && points2.length >= 2) {
      // OSM rarely gives true street-level terrain height, but structural tags
      // like steps/bridge/tunnel/layer are enough to imply toy-scale verticality.
      const elevation = roadElevation(way.tags);
      const roadPoints = points2.map((point) => new Vector3(point.x, 0.035 + elevation + sampleElevationUnits(elevationGrid, point.x, point.y), point.y));
      if (!roadPoints.some(isInsideField) && !roadPoints.some((point, index) => index > 0 && isSegmentNearField(roadPoints[index - 1], point))) {
        continue;
      }
      const road: RoadData = {
        id: `osm-road-${way.id}`,
        points: roadPoints,
        width: roadWidth(way.tags),
        kind: roadKind(way.tags),
        elevation,
        hasSteps: way.tags.highway === 'steps',
      };
      roads.push(road);
      const length = pathLength(roadPoints);
      const path = createRoadPath(`osm-path-${way.id}`, road, random);
      if (path && length >= 0.9) {
        pathCandidates.push({
          path,
          score: pathScore(way.tags, road, length),
          tieBreak: random.next(),
        });
      }
    }

    if ((way.tags?.waterway || way.tags?.natural === 'water' || way.tags?.water) && points2.length >= 2) {
      const kind = waterKind(way.tags);
      const width = waterWidth(way.tags);
      const waterPoints = points2.map((point) => {
        const terrainY = sampleElevationUnits(elevationGrid, point.x, point.y);
        return new Vector3(point.x, terrainY + 0.012, point.y);
      });
      if (!waterPoints.some(isInsideField) && !waterPoints.some((point, index) => index > 0 && isSegmentNearField(waterPoints[index - 1], point))) {
        continue;
      }
      waters.push({
        id: `osm-water-${way.id}`,
        points: waterPoints,
        width,
        kind,
      });
    }
  }

  // Use more OSM roads as movement paths, but bias toward routes a person
  // would plausibly walk through: alleys, steps, footways, service lanes.
  pathCandidates
    .sort((a, b) => b.score - a.score || a.tieBreak - b.tieBreak)
    .slice(0, 76)
    .forEach((candidate) => paths.push(candidate.path));

  if (paths.length === 0) {
    throw new Error('OSM payload did not contain usable road paths');
  }

  return { buildings, paths, roads, waters, doors, source: 'osm', elevationGrid };
}
