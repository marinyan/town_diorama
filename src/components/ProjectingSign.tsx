import { Ambience } from '../ambience';

export type SignSide = 'north' | 'south' | 'east' | 'west';

export type ProjectingSignSpec = {
  side: SignSide;
  offset: number;
  y: number;
  height: number;
  width: number;
  protrude: number;
  color: string;
};

type ProjectingSignProps = {
  buildingSize: [number, number, number];
  ambience: Ambience;
  spec: ProjectingSignSpec;
};

export function ProjectingSign({ buildingSize, ambience, spec }: ProjectingSignProps) {
  const [w, , d] = buildingSize;
  const isNorth = spec.side === 'north';
  const isSouth = spec.side === 'south';
  const isEast = spec.side === 'east';
  const signX = isEast ? w / 2 + spec.protrude / 2 : spec.side === 'west' ? -w / 2 - spec.protrude / 2 : spec.offset;
  const signZ = isNorth ? d / 2 + spec.protrude / 2 : isSouth ? -d / 2 - spec.protrude / 2 : spec.offset;
  const panelSize: [number, number, number] =
    isNorth || isSouth ? [spec.width, spec.height, spec.protrude] : [spec.protrude, spec.height, spec.width];
  const bracketPosition: [number, number, number] =
    isNorth || isSouth
      ? [spec.offset, spec.y, isNorth ? d / 2 + 0.08 : -d / 2 - 0.08]
      : [isEast ? w / 2 + 0.08 : -w / 2 - 0.08, spec.y, spec.offset];
  const bracketSize: [number, number, number] = isNorth || isSouth ? [0.08, spec.height * 0.82, 0.16] : [0.16, spec.height * 0.82, 0.08];
  const lineSize: [number, number, number] =
    isNorth || isSouth ? [spec.width * 0.68, 0.055, spec.protrude + 0.018] : [spec.protrude + 0.018, 0.055, spec.width * 0.68];

  return (
    <group>
      <mesh position={[signX, spec.y, signZ]} castShadow>
        <boxGeometry args={panelSize} />
        <meshStandardMaterial
          color={spec.color}
          emissive={spec.color}
          emissiveIntensity={ambience.signEmissiveIntensity * 1.15}
          roughness={0.28}
        />
      </mesh>
      <mesh position={bracketPosition}>
        <boxGeometry args={bracketSize} />
        <meshStandardMaterial color="#5c6464" roughness={0.62} metalness={0.12} />
      </mesh>
      {[-0.28, 0, 0.28].map((dy, index) => (
        <mesh key={index} position={[signX, spec.y + dy * spec.height, signZ]}>
          <boxGeometry args={lineSize} />
          <meshStandardMaterial
            color="#fff1c4"
            emissive="#ffe4a2"
            emissiveIntensity={ambience.signEmissiveIntensity * 0.85}
            roughness={0.22}
          />
        </mesh>
      ))}
    </group>
  );
}
