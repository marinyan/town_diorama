import { useMemo } from 'react';
import { BoxGeometry, MeshStandardMaterial } from 'three';
import { Ambience } from '../ambience';
import { CityLayout } from '../cityData';
import { Building } from './Building';

type CityBlockProps = {
  layout: CityLayout;
  ambience: Ambience;
};

const roadXs = [-27, -18, -9, 0, 9, 18, 27];
const roadZs = [-24, -15, -5, 5, 15, 24];

export function CityBlock({ layout, ambience }: CityBlockProps) {
  const asphalt = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#24272a',
        roughness: 0.58 - ambience.wetRoadReflection * 0.28,
        metalness: ambience.wetRoadReflection * 0.22,
        envMapIntensity: 0.35 + ambience.wetRoadReflection * 1.5,
      }),
    [ambience.wetRoadReflection],
  );
  const curb = useMemo(() => new MeshStandardMaterial({ color: '#4f5555', roughness: 0.72 }), []);
  const lane = useMemo(
    () =>
      new MeshStandardMaterial({
        color: ambience.wetRoadReflection > 0.5 ? '#7f8580' : '#6c726d',
        roughness: 0.42,
        metalness: ambience.wetRoadReflection * 0.1,
      }),
    [ambience.wetRoadReflection],
  );
  const isOsm = layout.source === 'osm' && layout.roads && layout.roads.length > 0;
  const withinField = (x: number, z: number) => Math.abs(x) <= 36 && Math.abs(z) <= 31;

  return (
    <group>
      <mesh receiveShadow position={[0, -0.08, 0]}>
        <boxGeometry args={[72, 0.15, 62]} />
        <meshStandardMaterial color="#3b423e" roughness={0.86} />
      </mesh>

      {isOsm
        ? layout.roads?.flatMap((road) =>
            road.points.slice(0, -1).map((start, index) => {
              const end = road.points[index + 1];
              const dx = end.x - start.x;
              const dz = end.z - start.z;
              const length = Math.hypot(dx, dz);
              if (length < 0.05) return null;
              if (!withinField(start.x, start.z) && !withinField(end.x, end.z)) return null;
              const angle = Math.atan2(dx, dz);
              return (
                <mesh
                  key={`${road.id}-${index}`}
                  receiveShadow
                  position={[(start.x + end.x) / 2, 0.025, (start.z + end.z) / 2]}
                  rotation={[0, angle, 0]}
                  material={asphalt}
                >
                  <boxGeometry args={[road.width, 0.08, length + road.width * 0.4]} />
                </mesh>
              );
            }),
          )
        : roadZs.map((z) => (
        <group key={`road-z-${z}`}>
          <mesh receiveShadow position={[0, 0.01, z]} material={asphalt}>
            <boxGeometry args={[71, 0.08, 2.6]} />
          </mesh>
          <mesh position={[0, 0.07, z - 1.38]} material={curb}>
            <boxGeometry args={[71, 0.14, 0.14]} />
          </mesh>
          <mesh position={[0, 0.07, z + 1.38]} material={curb}>
            <boxGeometry args={[71, 0.14, 0.14]} />
          </mesh>
          <mesh position={[0, 0.09, z]} material={lane}>
            <boxGeometry args={[58, 0.025, 0.045]} />
          </mesh>
        </group>
          ))}

      {!isOsm && roadXs.map((x) => (
        <group key={`road-x-${x}`}>
          <mesh receiveShadow position={[x, 0.02, 0]} material={asphalt}>
            <boxGeometry args={[2.35, 0.08, 60]} />
          </mesh>
          <mesh position={[x - 1.28, 0.07, 0]} material={curb}>
            <boxGeometry args={[0.13, 0.14, 60]} />
          </mesh>
          <mesh position={[x + 1.28, 0.07, 0]} material={curb}>
            <boxGeometry args={[0.13, 0.14, 60]} />
          </mesh>
        </group>
      ))}

      <mesh position={[-35.6, 0.35, 0]}>
        <boxGeometry args={[0.45, 0.85, 62]} />
        <meshStandardMaterial color="#535b57" roughness={0.7} />
      </mesh>
      <mesh position={[35.6, 0.35, 0]}>
        <boxGeometry args={[0.45, 0.85, 62]} />
        <meshStandardMaterial color="#535b57" roughness={0.7} />
      </mesh>

      {layout.buildings.map((building) => (
        <Building key={building.id} building={building} ambience={ambience} />
      ))}

      <mesh position={[0, 0.13, -31.2]}>
        <boxGeometry args={[72, 0.18, 0.4]} />
        <meshStandardMaterial color="#58615d" roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.13, 31.2]}>
        <boxGeometry args={[72, 0.18, 0.4]} />
        <meshStandardMaterial color="#58615d" roughness={0.72} />
      </mesh>
    </group>
  );
}

export const reusableBox = new BoxGeometry(1, 1, 1);
