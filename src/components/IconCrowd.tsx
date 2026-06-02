import { useMemo } from 'react';
import { Ambience } from '../ambience';
import { BuildingData, CrowdPath } from '../cityData';
import { createRandom } from '../random';
import { RetroMapIcon } from './RetroMapIcon';

type IconCrowdProps = {
  paths: CrowdPath[];
  buildings: BuildingData[];
  ambience: Ambience;
};

export type IconAgent = {
  id: string;
  path: CrowdPath;
  speed: number;
  weatherSpeed: number;
  phase: number;
  color: string;
  variant: 'default' | 'warm' | 'umbrella';
  scale: number;
};

const zoneWeights: Record<CrowdPath['zone'], Record<string, number>> = {
  commute: { morning: 1.35, noon: 0.7, dusk: 1.0, night: 0.58, lateNight: 0.16 },
  scatter: { morning: 0.75, noon: 1.0, dusk: 0.78, night: 0.48, lateNight: 0.18 },
  nightlife: { morning: 0.16, noon: 0.26, dusk: 1.05, night: 1.28, lateNight: 0.32 },
  rooftop: { morning: 0.2, noon: 0.32, dusk: 0.44, night: 0.34, lateNight: 0.12 },
};

export type IconOccluder = {
  x: number;
  z: number;
  w: number;
  d: number;
  top: number;
};

export function IconCrowd({ paths, buildings, ambience }: IconCrowdProps) {
  const occluders = useMemo(
    () =>
      buildings.map((building) => ({
        x: building.position[0],
        z: building.position[2],
        w: building.size[0],
        d: building.size[2],
        top: building.position[1] + building.size[1] / 2,
      })),
    [buildings],
  );

  const agents = useMemo(() => {
    const random = createRandom(7601);
    const weatherDensity =
      ambience.state.weather === 'thunderstorm'
        ? 0.34
        : ambience.state.weather === 'rain'
          ? 0.82
          : ambience.state.weather === 'drizzle'
            ? 0.92
            : ambience.state.weather === 'snow'
              ? 0.74
              : 1;
    const count = Math.round(360 * ambience.pedestrianDensity * weatherDensity);
    const weightedPaths = paths.flatMap((path) => {
      const zoneWeight = zoneWeights[path.zone][ambience.timePreset] ?? 0.5;
      const nightlifeBoost = path.zone === 'nightlife' ? ambience.nightlifeDensity : 1;
      return Array.from({ length: Math.max(1, Math.round(zoneWeight * nightlifeBoost * 5)) }, () => path);
    });

    return Array.from({ length: count }, (_, index): IconAgent => {
      const variant = random.chance(ambience.umbrellaRatio) ? 'umbrella' : random.chance(0.08) ? 'warm' : 'default';
      const baseWeatherSpeed =
        ambience.state.weather === 'thunderstorm'
          ? 0.62
          : ambience.state.weather === 'rain'
            ? 0.82
            : ambience.state.weather === 'drizzle'
              ? 0.92
              : ambience.state.weather === 'snow'
                ? 0.72
                : 1;
      const noUmbrellaHurry =
        variant !== 'umbrella' && (ambience.state.weather === 'rain' || ambience.state.weather === 'drizzle' || ambience.state.weather === 'thunderstorm')
          ? ambience.state.weather === 'thunderstorm'
            ? 1.34
            : 1.22
          : 1;
      return {
        id: `icon-${index}`,
        path: random.pick(weightedPaths),
        speed: random.range(0.34, 0.78) * (ambience.timePreset === 'lateNight' ? 0.72 : 1),
        weatherSpeed: baseWeatherSpeed * noUmbrellaHurry,
        phase: random.range(0, 1),
        color: variant === 'warm' ? random.pick(['#7dc8ff', '#a8dbff', '#76d2c5', '#f2c36b']) : '#3398e6',
        variant,
        scale: random.range(0.72, 1.08),
      };
    });
  }, [
    ambience.nightlifeDensity,
    ambience.pedestrianDensity,
    ambience.state.weather,
    ambience.timePreset,
    ambience.umbrellaRatio,
    paths,
  ]);

  return (
    <group>
      {agents.map((agent) => (
        <RetroMapIcon key={agent.id} agent={agent} occluders={occluders} />
      ))}
    </group>
  );
}
