import { useMemo } from 'react';
import { createRandom } from '../random';

type RooftopDetailProps = {
  size: [number, number, number];
  seed: number;
  hasStairs: boolean;
};

export function RooftopDetail({ size, seed, hasStairs }: RooftopDetailProps) {
  const [w, h, d] = size;
  const details = useMemo(() => {
    const random = createRandom(seed);
    return Array.from({ length: random.int(4, 8) }, (_, index) => ({
      id: index,
      x: random.range(-w / 2 + 0.6, w / 2 - 0.6),
      z: random.range(-d / 2 + 0.6, d / 2 - 0.6),
      sx: random.range(0.22, 0.75),
      sy: random.range(0.18, 0.55),
      sz: random.range(0.22, 0.7),
      color: random.pick(['#9aa09b', '#6f7776', '#b5ada0', '#565f62']),
    }));
  }, [d, seed, w]);

  return (
    <group position={[0, h / 2 + 0.12, 0]}>
      {details.map((detail) => (
        <mesh key={detail.id} position={[detail.x, detail.sy / 2, detail.z]} castShadow>
          <boxGeometry args={[detail.sx, detail.sy, detail.sz]} />
          <meshStandardMaterial color={detail.color} roughness={0.75} />
        </mesh>
      ))}
      <mesh position={[-w / 2 + 0.24, 0.22, 0]}>
        <boxGeometry args={[0.08, 0.44, d * 0.82]} />
        <meshStandardMaterial color="#89928e" roughness={0.62} />
      </mesh>
      <mesh position={[w / 2 - 0.24, 0.22, 0]}>
        <boxGeometry args={[0.08, 0.44, d * 0.82]} />
        <meshStandardMaterial color="#89928e" roughness={0.62} />
      </mesh>
      {hasStairs ? (
        <group position={[w / 2 + 0.16, -h * 0.26, -d * 0.16]} rotation={[0, 0, -0.28]}>
          {Array.from({ length: 6 }).map((_, index) => (
            <mesh key={index} position={[0, index * 0.22, index * 0.21]}>
              <boxGeometry args={[0.44, 0.06, 0.3]} />
              <meshStandardMaterial color="#707978" roughness={0.78} />
            </mesh>
          ))}
        </group>
      ) : null}
    </group>
  );
}
