import { Vector3 } from 'three';
import { ElevationGrid } from './map/elevationTypes';
import { createRandom } from './random';

export type BuildingData = {
  id: string;
  position: [number, number, number];
  size: [number, number, number];
  footprint?: Array<[number, number]>;
  color: string;
  roofColor: string;
  roofStyle?: 'flat' | 'gable';
  roofAxis?: 'x' | 'z';
  signSides: Array<'north' | 'south' | 'east' | 'west'>;
  hasStairs: boolean;
  windowSeed: number;
};

export type PathPoint = {
  position: Vector3;
  pause?: number;
  hidden?: boolean;
  doorPause?: boolean;
};

export type CrowdPath = {
  id: string;
  points: PathPoint[];
  zone: 'commute' | 'scatter' | 'nightlife' | 'rooftop';
};

export type RoadData = {
  id: string;
  points: Vector3[];
  width: number;
  kind: 'main' | 'side' | 'alley';
  elevation: number;
  hasSteps?: boolean;
};

export type WaterData = {
  id: string;
  points: Vector3[];
  width: number;
  kind: 'river' | 'canal' | 'stream' | 'basin';
};

export type CityLayout = {
  buildings: BuildingData[];
  paths: CrowdPath[];
  roads?: RoadData[];
  waters?: WaterData[];
  doors: Vector3[];
  source?: 'procedural' | 'osm';
  elevationGrid?: ElevationGrid;
};

const roadXs = [-27, -18, -9, 0, 9, 18, 27];
const roadZs = [-24, -15, -5, 5, 15, 24];

const v = (x: number, y: number, z: number) => new Vector3(x, y, z);

function makeStreetPath(id: string, z: number, zone: CrowdPath['zone'], reverse = false): CrowdPath {
  const xs = reverse ? [...roadXs].reverse() : roadXs;
  return {
    id,
    zone,
    points: xs.map((x, index) => ({
      position: v(x, 0.08, z + (index % 2 === 0 ? 0.45 : -0.35)),
      pause: index === 2 ? 1.8 : 0,
    })),
  };
}

function makeCrossPath(id: string, x: number, zone: CrowdPath['zone'], reverse = false): CrowdPath {
  const zs = reverse ? [...roadZs].reverse() : roadZs;
  return {
    id,
    zone,
    points: zs.map((z, index) => ({
      position: v(x + (index % 2 ? 0.3 : -0.25), 0.08, z),
      pause: index === 1 ? 1.2 : 0,
    })),
  };
}

export function createCityLayout(seed = 1984): CityLayout {
  const random = createRandom(seed);
  const buildings: BuildingData[] = [];
  const doors: Vector3[] = [];
  const blockXs = [-31.5, -22.5, -13.5, -4.5, 4.5, 13.5, 22.5, 31.5];
  const blockZs = [-28.5, -19.5, -10, 0, 10, 19.5, 28.5];
  let id = 0;

  for (const z of blockZs) {
    for (const x of blockXs) {
      const width = random.range(4.2, 6.6);
      const depth = random.range(4, 6.2);
      const height = random.range(2.3, Math.abs(z) < 8 ? 8.5 : 11.5);
      const palette = ['#6f7372', '#7b746d', '#5f6770', '#807b72', '#68736e'];
      const roofPalette = ['#3f4648', '#46413f', '#38424a', '#4a4a42'];
      const signSides: BuildingData['signSides'] = [];
      if (height > 4.4 && random.chance(0.22)) signSides.push(random.pick(['north', 'south']));
      if (height > 5.2 && random.chance(0.12)) signSides.push(random.pick(['east', 'west']));
      buildings.push({
        id: `building-${id++}`,
        position: [x + random.range(-0.7, 0.7), height / 2, z + random.range(-0.5, 0.5)],
        size: [width, height, depth],
        color: random.pick(palette),
        roofColor: random.pick(roofPalette),
        roofStyle: height <= 4.9 && random.chance(0.68) ? 'gable' : 'flat',
        roofAxis: width >= depth ? 'x' : 'z',
        signSides,
        hasStairs: random.chance(0.5),
        windowSeed: random.int(10, 9000),
      });
      doors.push(v(x + random.range(-1.7, 1.7), 0.09, z + Math.sign(z || 1) * (depth / 2 + 0.8)));
    }
  }

  const paths: CrowdPath[] = [
    makeStreetPath('commute-east', -15, 'commute'),
    makeStreetPath('commute-west', 15, 'commute', true),
    makeStreetPath('outer-east', -24, 'commute', true),
    makeStreetPath('outer-west', 24, 'scatter'),
    makeStreetPath('nightlife-alley', 5, 'nightlife'),
    makeStreetPath('scatter-lane', -5, 'scatter', true),
    makeCrossPath('cross-main', 0, 'commute'),
    makeCrossPath('cross-food', 9, 'nightlife', true),
    makeCrossPath('cross-quiet', -9, 'scatter'),
    makeCrossPath('cross-left-deep', -18, 'nightlife'),
    makeCrossPath('cross-right-deep', 18, 'scatter', true),
    makeCrossPath('cross-edge-a', -27, 'commute', true),
    makeCrossPath('cross-edge-b', 27, 'nightlife'),
    {
      id: 'door-hop-a',
      zone: 'nightlife',
      points: [
        { position: v(-18, 0.08, 5) },
        { position: v(-13.5, 0.08, 5.4), pause: 2.5 },
        { position: v(-13.5, 0.08, 7.6), hidden: true, pause: 2 },
        { position: v(-4.5, 0.08, 7.6), hidden: true },
        { position: v(-4.5, 0.08, 5.2), pause: 2.4, doorPause: true },
        { position: v(0, 0.08, 5) },
      ],
    },
    {
      id: 'rooftop-shortcut',
      zone: 'rooftop',
      points: [
        { position: v(4.7, 0.08, -5.2), pause: 1 },
        { position: v(4.7, 2.1, -2.5) },
        { position: v(4.7, 5.2, 0.2), pause: 2.4 },
        { position: v(8.6, 5.2, 0.4) },
        { position: v(8.8, 2.2, 3.4) },
        { position: v(9.1, 0.08, 5.2), pause: 0.8 },
      ],
    },
  ];

  for (let i = 0; i < doors.length - 8; i += 9) {
    const entry = doors[i];
    const exit = doors[i + 5];
    const midA = entry.clone().lerp(exit, 0.32);
    const midB = entry.clone().lerp(exit, 0.68);
    paths.push({
      id: `door-thread-${i}`,
      zone: random.chance(0.62) ? 'nightlife' : 'scatter',
      points: [
        { position: entry.clone().add(v(random.range(-2.2, 2.2), 0, random.range(-1.2, 1.2))), pause: random.range(0.4, 1.2) },
        { position: entry.clone(), pause: random.range(1.4, 2.4) },
        { position: midA, hidden: true, pause: random.range(0.6, 1.4) },
        { position: midB, hidden: true },
        { position: exit.clone(), pause: random.range(1.4, 2.6), doorPause: true },
        { position: exit.clone().add(v(random.range(-2.4, 2.4), 0, random.range(-1.4, 1.4))) },
      ],
    });
  }

  return { buildings, paths, doors, source: 'procedural' };
}
