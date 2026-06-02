import { useLayoutEffect, useMemo, useRef } from 'react';
import { ExtrudeGeometry, InstancedMesh, MeshStandardMaterial, Object3D, PlaneGeometry, Shape } from 'three';
import { Ambience } from '../ambience';
import { BuildingData } from '../cityData';
import { createRandom } from '../random';
import { AviationLight } from './AviationLight';
import { ProjectingSign, ProjectingSignSpec, SignSide } from './ProjectingSign';
import { RooftopDetail } from './RooftopDetail';
import { Sign } from './Sign';

type BuildingProps = {
  building: BuildingData;
  ambience: Ambience;
};

export function Building({ building, ambience }: BuildingProps) {
  const [x, y, z] = building.position;
  const [w, h, d] = building.size;
  const usesFootprint = Boolean(building.footprint && building.footprint.length >= 3);
  const projectingSigns = useMemo(() => {
    if (h > 8.9 || h < 2.2) return [];
    const random = createRandom(building.windowSeed + 1205);
    const palette = ['#f25f5c', '#4db3df', '#f2c14e', '#70c878', '#f08ac0', '#fff0a8'];
    const sideChoices: SignSide[] = ['north', 'south', 'east', 'west'];
    const side = building.signSides.length > 0 ? random.pick(building.signSides) : random.pick(sideChoices);
    const specs: ProjectingSignSpec[] = [];

    if (!random.chance(usesFootprint ? 0.82 : 0.58)) return specs;
    const sideSpan = side === 'north' || side === 'south' ? w : d;
    const count = random.chance(h < 5.2 ? 0.55 : 0.22) ? 2 : 1;
    for (let i = 0; i < count; i++) {
      specs.push({
        side,
        offset: random.range(-sideSpan * 0.32, sideSpan * 0.32),
        y: random.range(-h * 0.28, h * 0.24),
        height: random.range(0.85, Math.min(1.9, h * 0.42)),
        width: random.range(0.12, 0.2),
        protrude: random.range(0.24, 0.42),
        color: random.pick(palette),
      });
    }

    return specs.slice(0, 3);
  }, [building.signSides, building.windowSeed, d, h, usesFootprint, w]);
  const extrudedGeometry = useMemo(() => {
    if (!usesFootprint || !building.footprint) return null;
    const shape = new Shape();
    building.footprint.forEach(([px, pz], index) => {
      if (index === 0) shape.moveTo(px, pz);
      else shape.lineTo(px, pz);
    });
    shape.closePath();
    const geometry = new ExtrudeGeometry(shape, {
      depth: h,
      bevelEnabled: false,
    });
    geometry.rotateX(Math.PI / 2);
    geometry.translate(0, h / 2, 0);
    geometry.computeVertexNormals();
    return geometry;
  }, [building.footprint, h, usesFootprint]);
  const litWindows = useMemo(() => {
    const random = createRandom(building.windowSeed);
    const windows: Array<{ x: number; y: number; z: number; ry: number; sx: number; sy: number }> = [];
    const columnsX = Math.max(2, Math.floor(w / 0.9));
    const columnsZ = Math.max(2, Math.floor(d / 0.9));
    const rows = Math.max(2, Math.floor(h / 1.05));
    const addWindow = (wx: number, wy: number, wz: number, ry: number) => {
      if (random.chance(0.68)) {
        windows.push({ x: wx, y: wy, z: wz, ry, sx: random.range(0.22, 0.34), sy: random.range(0.24, 0.36) });
      }
    };

    for (let row = 1; row < rows; row++) {
      const wy = row * (h / rows) - h / 2;
      for (let col = 1; col < columnsX; col++) {
        const wx = col * (w / columnsX) - w / 2;
        addWindow(wx, wy, d / 2 + 0.012, 0);
        addWindow(wx, wy, -d / 2 - 0.012, Math.PI);
      }
      for (let col = 1; col < columnsZ; col++) {
        const wz = col * (d / columnsZ) - d / 2;
        addWindow(w / 2 + 0.012, wy, wz, Math.PI / 2);
        addWindow(-w / 2 - 0.012, wy, wz, -Math.PI / 2);
      }
    }
    return windows;
  }, [building.windowSeed, d, h, w]);

  const windowRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const windowGeometry = useMemo(() => new PlaneGeometry(1, 1), []);
  const windowMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#ffe2a6',
        emissive: '#ffd178',
        emissiveIntensity: (0.18 + ambience.windowLightProbability * 1.25) * (0.72 + ambience.signEmissiveIntensity * 0.25),
        opacity: 0.18 + ambience.windowLightProbability * 0.82,
        transparent: true,
        roughness: 0.2,
      }),
    [ambience.signEmissiveIntensity, ambience.windowLightProbability],
  );

  useLayoutEffect(() => {
    const mesh = windowRef.current;
    if (!mesh) return;
    litWindows.forEach((window, index) => {
      dummy.position.set(window.x, window.y, window.z);
      dummy.rotation.set(0, window.ry, 0);
      dummy.scale.set(window.sx, window.sy, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [dummy, litWindows]);

  return (
    <group position={[x, y, z]}>
      {extrudedGeometry ? (
        <>
          <mesh castShadow receiveShadow geometry={extrudedGeometry}>
            <meshStandardMaterial color={building.color} roughness={0.86} />
          </mesh>
        </>
      ) : (
        <>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color={building.color} roughness={0.86} />
          </mesh>
          <mesh position={[0, h / 2 + 0.05, 0]} receiveShadow>
            <boxGeometry args={[w + 0.12, 0.1, d + 0.12]} />
            <meshStandardMaterial color={building.roofColor} roughness={0.82} />
          </mesh>
        </>
      )}
      {litWindows.length > 0 ? (
        <instancedMesh ref={windowRef} args={[windowGeometry, windowMaterial, litWindows.length]} renderOrder={2} />
      ) : null}
      {!usesFootprint &&
        building.signSides.map((side, index) => (
          <Sign key={`${building.id}-sign-${side}-${index}`} side={side} buildingSize={building.size} ambience={ambience} index={index} />
        ))}
      {projectingSigns.map((spec, index) => (
        <ProjectingSign key={`${building.id}-projecting-sign-${index}`} buildingSize={building.size} ambience={ambience} spec={spec} />
      ))}
      {!usesFootprint ? <RooftopDetail size={building.size} seed={building.windowSeed + 42} hasStairs={building.hasStairs} /> : null}
      {h >= 9.8 && building.windowSeed % 3 === 0 ? <AviationLight height={h} seed={building.windowSeed} /> : null}
    </group>
  );
}
