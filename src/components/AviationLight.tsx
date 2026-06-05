import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Mesh, PointLight } from 'three';

type AviationLightProps = {
  height: number;
  opacity?: number;
  seed: number;
};

export function AviationLight({ height, opacity = 1, seed }: AviationLightProps) {
  const meshRef = useRef<Mesh>(null);
  const lightRef = useRef<PointLight>(null);
  const phase = (seed % 997) / 997;

  useFrame(({ clock }) => {
    const pulse = (Math.sin(clock.elapsedTime * 0.95 + phase * Math.PI * 2) + 1) / 2;
    const intensity = 0.04 + pulse * pulse * 0.34;
    if (meshRef.current) {
      const material = Array.isArray(meshRef.current.material) ? meshRef.current.material[0] : meshRef.current.material;
      material.opacity = (0.16 + pulse * 0.44) * opacity;
    }
    if (lightRef.current) {
      lightRef.current.intensity = intensity * opacity;
    }
  });

  return (
    <group position={[0, height / 2 + 0.18, 0]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.065, 8, 6]} />
        <meshBasicMaterial color="#ff3b3b" transparent opacity={0.8} />
      </mesh>
      <pointLight ref={lightRef} color="#ff3333" intensity={0.18} distance={2.2} />
    </group>
  );
}
