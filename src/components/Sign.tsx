import { useMemo } from 'react';
import { Ambience } from '../ambience';

type SignProps = {
  side: 'north' | 'south' | 'east' | 'west';
  buildingSize: [number, number, number];
  ambience: Ambience;
  index: number;
  opacity?: number;
};

const signColors = ['#f05d5e', '#4ca7d9', '#f0bd45', '#74c476', '#e77eb5'];

export function Sign({ side, buildingSize, ambience, index, opacity = 1 }: SignProps) {
  const [w, h, d] = buildingSize;
  const color = signColors[index % signColors.length];
  const transform = useMemo(() => {
    const y = Math.min(h / 2 - 0.8 - index * 0.55, h / 2 - 0.5);
    if (side === 'north') return { position: [0, y, d / 2 + 0.035] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], size: [Math.min(w * 0.62, 2.4), 0.55, 0.04] as [number, number, number] };
    if (side === 'south') return { position: [0, y, -d / 2 - 0.035] as [number, number, number], rotation: [0, Math.PI, 0] as [number, number, number], size: [Math.min(w * 0.62, 2.4), 0.55, 0.04] as [number, number, number] };
    if (side === 'east') return { position: [w / 2 + 0.035, y, 0] as [number, number, number], rotation: [0, Math.PI / 2, 0] as [number, number, number], size: [Math.min(d * 0.62, 2.2), 0.5, 0.04] as [number, number, number] };
    return { position: [-w / 2 - 0.035, y, 0] as [number, number, number], rotation: [0, -Math.PI / 2, 0] as [number, number, number], size: [Math.min(d * 0.62, 2.2), 0.5, 0.04] as [number, number, number] };
  }, [d, h, index, side, w]);

  return (
    <group position={transform.position} rotation={transform.rotation}>
      <mesh>
        <boxGeometry args={transform.size} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={ambience.signEmissiveIntensity * opacity}
          opacity={opacity}
          roughness={0.32}
          transparent={opacity < 0.999}
          depthWrite={opacity >= 0.999}
        />
      </mesh>
      <mesh position={[0, 0, 0.04]}>
        <boxGeometry args={[transform.size[0] * 0.66, 0.055, 0.025]} />
        <meshStandardMaterial
          color="#fff4d7"
          emissive="#ffe8b0"
          emissiveIntensity={ambience.signEmissiveIntensity * 0.8 * opacity}
          opacity={opacity}
          transparent={opacity < 0.999}
          depthWrite={opacity >= 0.999}
        />
      </mesh>
      <mesh position={[0, -0.16, 0.04]}>
        <boxGeometry args={[transform.size[0] * 0.42, 0.045, 0.025]} />
        <meshStandardMaterial
          color="#fff4d7"
          emissive="#ffe8b0"
          emissiveIntensity={ambience.signEmissiveIntensity * 0.65 * opacity}
          opacity={opacity}
          transparent={opacity < 0.999}
          depthWrite={opacity >= 0.999}
        />
      </mesh>
    </group>
  );
}
