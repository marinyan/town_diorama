import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { BoxGeometry, InstancedMesh, MeshBasicMaterial, Object3D } from 'three';
import { Ambience } from '../ambience';
import { createRandom } from '../random';

type WeatherSystemProps = {
  ambience: Ambience;
  visible: boolean;
};

type Drop = {
  x: number;
  y: number;
  z: number;
  seed: number;
  seedB: number;
  speed: number;
  length: number;
  phase: number;
};

const maxDrops = 760;

export function WeatherSystem({ ambience, visible }: WeatherSystemProps) {
  const isSnow = ambience.state.weather === 'snow';
  const isDrizzle = ambience.state.weather === 'drizzle';
  const isStorm = ambience.state.weather === 'thunderstorm';
  const hasPrecip = ambience.state.weather === 'rain' || isSnow || isDrizzle || isStorm;
  const rainIntensity = hasPrecip ? Math.max(isSnow ? 0.025 : isDrizzle ? 0.035 : 0.06, ambience.rainIntensity) : 0;
  const windFactor = Math.min(1, Math.max(0, ambience.state.windSpeedKmh / 38));
  const count = Math.min(maxDrops, Math.round(maxDrops * rainIntensity * (isSnow ? 0.72 : isDrizzle ? 0.45 : isStorm ? 1.15 : 1)));
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);
  const material = useMemo(() => new MeshBasicMaterial({ color: '#b8d9ff', transparent: true, opacity: 0.28, depthWrite: false }), []);
  // Keep one deterministic particle pool alive and only vary the active count;
  // this avoids rain/snow flicker when live weather updates arrive.
  const drops = useMemo(() => {
    const random = createRandom(2211);
    return Array.from({ length: maxDrops }, (): Drop => ({
      x: random.range(-38, 38),
      y: random.range(2, 20),
      z: random.range(-34, 34),
      seed: random.next(),
      seedB: random.next(),
      speed: random.range(7, 12),
      length: random.range(0.35, 0.8),
      phase: random.range(-1, 1),
    }));
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const activeCount = visible ? count : 0;
    mesh.count = activeCount;
    material.color.set(isSnow ? '#f2f7ff' : isStorm ? '#c5ddff' : '#b8d9ff');
    for (let i = 0; i < activeCount; i++) {
      const drop = drops[i];
      dummy.position.set(drop.x, drop.y, drop.z);
      dummy.rotation.set(isSnow ? 0 : 0.12 + windFactor * 0.18, 0, isSnow ? 0 : -0.12 - windFactor * (isStorm ? 0.48 : 0.58));
      dummy.scale.set(isSnow ? 0.07 : isDrizzle ? 0.01 : 0.018, isSnow ? 0.07 : drop.length, isSnow ? 0.07 : isDrizzle ? 0.01 : 0.018);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [count, drops, dummy, isDrizzle, isSnow, isStorm, material.color, visible, windFactor]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const activeCount = visible ? count : 0;
    if (mesh.count !== activeCount) mesh.count = activeCount;
    material.opacity = isSnow ? 0.22 + rainIntensity * 0.34 : isDrizzle ? 0.08 + rainIntensity * 0.18 : 0.12 + rainIntensity * (isStorm ? 0.38 : 0.28);
    material.color.set(isSnow ? '#f2f7ff' : isStorm ? '#c5ddff' : '#b8d9ff');
    const fallBoost = isSnow ? 0.24 + rainIntensity * 0.16 : isDrizzle ? 0.62 + rainIntensity * 0.16 : 1 + rainIntensity * (isStorm ? 0.7 : 0.45);
    const windDrift = isSnow
      ? 0.12 + ambience.state.windSpeedKmh * 0.055
      : isDrizzle
        ? 0.18 + ambience.state.windSpeedKmh * 0.07
        : 0.35 + ambience.state.windSpeedKmh * (isStorm ? 0.2 : 0.13);
    for (let i = 0; i < activeCount; i++) {
      const drop = drops[i];
      drop.y -= drop.speed * fallBoost * delta;
      drop.x -= delta * windDrift;
      drop.z += delta * drop.phase * (isSnow ? 0.42 + windFactor * 0.58 : windFactor * 0.55);
      if (drop.y < 0.2) {
        drop.y = 20;
        drop.seed = (drop.seed * 12.9898 + 0.61803398875) % 1;
        drop.seedB = (drop.seedB * 78.233 + 0.41421356237) % 1;
        drop.x = -38 + drop.seed * 76;
        drop.z = -34 + drop.seedB * 68;
      }
      if (drop.x < -42) drop.x = 42;
      if (drop.x > 42) drop.x = -42;
      if (drop.z < -34) drop.z = 34;
      if (drop.z > 34) drop.z = -34;
      dummy.position.set(drop.x, drop.y, drop.z);
      dummy.rotation.set(isSnow ? 0 : 0.12 + windFactor * 0.18, 0, isSnow ? 0 : -0.12 - windFactor * (isStorm ? 0.48 : 0.58));
      dummy.scale.set(
        isSnow ? 0.045 + drop.length * 0.04 : isDrizzle ? 0.008 + rainIntensity * 0.004 : 0.014 + rainIntensity * 0.008,
        isSnow
          ? 0.045 + drop.length * 0.04
          : drop.length * (isDrizzle ? 0.52 : isStorm ? 0.82 + windFactor * 0.22 : 0.82 + windFactor * 0.45),
        isSnow ? 0.045 + drop.length * 0.04 : isDrizzle ? 0.008 + rainIntensity * 0.004 : 0.014 + rainIntensity * 0.008,
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={meshRef} args={[geometry, material, maxDrops]} frustumCulled={false} />;
}
