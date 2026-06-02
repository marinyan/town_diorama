import { OrthographicCamera, Stars } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Group, PointLight, Vector3 } from 'three';
import { Ambience } from '../ambience';
import { CityLayout, createCityLayout } from '../cityData';
import { createCityLayoutFromOsm } from '../map/createLayoutFromOsm';
import { ElevationGrid } from '../map/elevationTypes';
import { OsmPayload } from '../map/osmTypes';
import { CityBlock } from './CityBlock';
import { IconCrowd } from './IconCrowd';
import { WeatherSystem } from './WeatherSystem';

type DioramaSceneProps = {
  ambience: Ambience;
  orbitPaused: boolean;
  crowdVisible: boolean;
  rainVisible: boolean;
  onCompassAngleChange?: (angle: number) => void;
};

function CameraRig({ onCompassAngleChange, paused }: { onCompassAngleChange?: (angle: number) => void; paused: boolean }) {
  const { camera } = useThree();
  const angle = useRef(0.76);
  const lastReportedAngle = useRef(-1);
  const target = useMemo(() => new Vector3(0, 1.8, 0), []);

  useFrame((_, delta) => {
    if (!paused) angle.current += delta * 0.035;
    if (onCompassAngleChange && Math.abs(angle.current - lastReportedAngle.current) > 0.01) {
      lastReportedAngle.current = angle.current;
      onCompassAngleChange(angle.current);
    }
    const radius = 52;
    camera.position.set(Math.cos(angle.current) * radius, 44, Math.sin(angle.current) * radius);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  });

  return null;
}

function LightningFlash({ active }: { active: boolean }) {
  const lightRef = useRef<PointLight>(null);
  const flash = useRef(0);
  const nextFlash = useRef(2.8);

  useFrame((_, delta) => {
    if (!active) {
      flash.current = 0;
      if (lightRef.current) lightRef.current.intensity = 0;
      return;
    }

    nextFlash.current -= delta;
    if (nextFlash.current <= 0) {
      flash.current = 1;
      nextFlash.current = 5 + Math.random() * 11;
    }
    flash.current = Math.max(0, flash.current - delta * 4.8);
    if (lightRef.current) {
      lightRef.current.intensity = flash.current * 6.5;
    }
  });

  return <pointLight ref={lightRef} position={[-18, 26, 10]} color="#dbe8ff" intensity={0} distance={90} />;
}

export function DioramaScene({ ambience, orbitPaused, crowdVisible, rainVisible, onCompassAngleChange }: DioramaSceneProps) {
  const fallbackLayout = useMemo(() => createCityLayout(1984), []);
  const [layout, setLayout] = useState<CityLayout>(fallbackLayout);
  const sceneRef = useRef<Group>(null);
  const fogArgs =
    ambience.state.weather === 'fog'
      ? [ambience.fogColor, 24, 86]
      : ambience.state.weather === 'drizzle'
        ? [ambience.fogColor, 36, 98]
        : ambience.state.weather === 'thunderstorm'
          ? [ambience.fogColor, 32, 92]
          : [ambience.fogColor, 40, 112];

  useEffect(() => {
    let active = true;
    const loadJson = async <T,>(url: string) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${url} unavailable: ${response.status}`);
      return response.json() as Promise<T>;
    };

    Promise.all([
      loadJson<OsmPayload>('data/gotanda-toc-osm.json'),
      loadJson<ElevationGrid>('data/gotanda-toc-elevation.json').catch(() => undefined),
    ])
      .then(([payload, elevationGrid]) => {
        if (!active) return;
        setLayout(createCityLayoutFromOsm(payload, 31415, elevationGrid));
      })
      .catch(() => {
        if (active) setLayout(fallbackLayout);
      });

    return () => {
      active = false;
    };
  }, [fallbackLayout]);

  return (
    <>
      <color attach="background" args={[ambience.skyColor]} />
      <fog attach="fog" args={fogArgs as [string, number, number]} />
      <group ref={sceneRef}>
        <OrthographicCamera makeDefault zoom={25} near={0.1} far={220} position={[40, 38, 40]} />
        <CameraRig paused={orbitPaused} onCompassAngleChange={onCompassAngleChange} />
        <hemisphereLight args={[ambience.skyColor, '#263038', 1.05]} />
        <directionalLight
          castShadow
          position={[-10, 18, 9]}
          intensity={ambience.sunlightIntensity}
          color="#ffe4c4"
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <LightningFlash active={ambience.state.weather === 'thunderstorm'} />
        <pointLight position={[0, 10, 0]} intensity={0.38} color="#8ab6ff" />
        {ambience.timePreset !== 'morning' && ambience.timePreset !== 'noon' ? (
          <Stars radius={70} depth={18} count={650} factor={2.1} saturation={0.2} fade speed={0.08} />
        ) : null}
        <CityBlock layout={layout} ambience={ambience} />
        {crowdVisible ? <IconCrowd paths={layout.paths} buildings={layout.buildings} ambience={ambience} /> : null}
        <WeatherSystem ambience={ambience} visible={rainVisible} />
      </group>
    </>
  );
}
