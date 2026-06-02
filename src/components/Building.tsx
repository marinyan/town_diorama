import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  BufferGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  Shape,
} from 'three';
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

type WindowSlot = {
  x: number;
  y: number;
  z: number;
  ry: number;
  sx: number;
  sy: number;
  threshold: number;
  warmth: number;
};

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function createWindowMaterial(color: string) {
  const material = new MeshBasicMaterial({
    color,
    opacity: 0.9,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
  material.customProgramCacheKey = () => 'window-instance-alpha-v1';
  material.onBeforeCompile = (shader) => {
    // Built-in materials do not support per-instance opacity, so each window
    // layer carries a tiny alpha attribute and lets the regular material do the rest.
    shader.vertexShader = [
      'attribute float instanceAlpha;',
      'varying float vInstanceAlpha;',
      shader.vertexShader.replace('#include <begin_vertex>', 'vInstanceAlpha = instanceAlpha;\n#include <begin_vertex>'),
    ].join('\n');
    shader.fragmentShader = [
      'varying float vInstanceAlpha;',
      shader.fragmentShader.replace('#include <alphatest_fragment>', 'diffuseColor.a *= vInstanceAlpha;\n#include <alphatest_fragment>'),
    ].join('\n');
  };
  return material;
}

function createGabledRoofGeometry(width: number, depth: number, height: number, axis: 'x' | 'z') {
  const w = width + 0.16;
  const d = depth + 0.16;
  const y = height / 2 + 0.03;
  const roofHeight = Math.min(0.8, Math.max(0.34, height * 0.16));
  const vertices =
    axis === 'x'
      ? [
          -w / 2,
          y,
          -d / 2,
          w / 2,
          y,
          -d / 2,
          -w / 2,
          y,
          d / 2,
          w / 2,
          y,
          d / 2,
          -w / 2,
          y + roofHeight,
          0,
          w / 2,
          y + roofHeight,
          0,
        ]
      : [
          -w / 2,
          y,
          -d / 2,
          w / 2,
          y,
          -d / 2,
          -w / 2,
          y,
          d / 2,
          w / 2,
          y,
          d / 2,
          0,
          y + roofHeight,
          -d / 2,
          0,
          y + roofHeight,
          d / 2,
        ];
  const indices = axis === 'x' ? [0, 1, 5, 0, 5, 4, 2, 4, 5, 2, 5, 3, 0, 4, 2, 1, 3, 5] : [0, 4, 2, 2, 4, 5, 1, 3, 5, 1, 5, 4, 0, 1, 4, 2, 5, 3];
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function GabledRoof({ ambience, building }: { ambience: Ambience; building: BuildingData }) {
  const [w, h, d] = building.size;
  const roofSnowOpacity = Math.min(0.36, ambience.snowCover * 0.46);
  const geometry = useMemo(() => createGabledRoofGeometry(w, d, h, building.roofAxis ?? (w >= d ? 'x' : 'z')), [building.roofAxis, d, h, w]);
  const snowGeometry = useMemo(() => {
    const snow = geometry.clone();
    snow.translate(0, 0.045, 0);
    return snow;
  }, [geometry]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => snowGeometry.dispose(), [snowGeometry]);

  return (
    <>
      <mesh castShadow receiveShadow geometry={geometry}>
        <meshStandardMaterial color={building.roofColor} roughness={0.84} />
      </mesh>
      {roofSnowOpacity > 0.01 ? (
        <mesh receiveShadow geometry={snowGeometry}>
          <meshStandardMaterial color="#e4ebef" roughness={0.94} transparent opacity={roofSnowOpacity} depthWrite={false} />
        </mesh>
      ) : null}
    </>
  );
}

function WindowLayer({ ambience, color, slots }: { ambience: Ambience; color: string; slots: WindowSlot[] }) {
  const windowRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const geometry = useMemo(() => {
    const plane = new PlaneGeometry(1, 1);
    plane.setAttribute('instanceAlpha', new InstancedBufferAttribute(new Float32Array(slots.length), 1));
    return plane;
  }, [slots.length]);
  const material = useMemo(() => createWindowMaterial(color), [color]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useLayoutEffect(() => {
    const mesh = windowRef.current;
    if (!mesh) return;
    const alphaAttribute = geometry.getAttribute('instanceAlpha') as InstancedBufferAttribute;
    const activeProbability = Math.max(0.04, Math.min(0.78, ambience.windowLightProbability));
    slots.forEach((window, index) => {
      const glow = smoothstep(window.threshold - 0.12, window.threshold + 0.08, activeProbability);
      dummy.position.set(window.x, window.y, window.z);
      dummy.rotation.set(0, window.ry, 0);
      dummy.scale.set(window.sx, window.sy, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      alphaAttribute.setX(index, glow);
    });
    mesh.instanceMatrix.needsUpdate = true;
    alphaAttribute.needsUpdate = true;
  }, [ambience.windowLightProbability, dummy, geometry, slots]);

  if (slots.length === 0) return null;
  return <instancedMesh ref={windowRef} args={[geometry, material, slots.length]} renderOrder={2} />;
}

export function Building({ building, ambience }: BuildingProps) {
  const [x, y, z] = building.position;
  const [w, h, d] = building.size;
  const usesFootprint = Boolean(building.footprint && building.footprint.length >= 3);
  const hasGabledRoof = building.roofStyle === 'gable';
  const roofSnowOpacity = Math.min(0.42, ambience.snowCover * 0.52);
  const projectingSigns = useMemo(() => {
    if (h > 8.9 || h < 2.2) return [];
    const random = createRandom(building.windowSeed + 1205);
    const palette = ['#f25f5c', '#4db3df', '#f2c14e', '#70c878', '#f08ac0', '#fff0a8'];
    const sideChoices: SignSide[] = ['north', 'south', 'east', 'west'];
    const side = building.signSides.length > 0 ? random.pick(building.signSides) : random.pick(sideChoices);
    const specs: ProjectingSignSpec[] = [];

    if (building.roofStyle === 'gable') return specs;
    if (!random.chance(usesFootprint ? 0.18 : 0.14)) return specs;
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
  const windowSlots = useMemo(() => {
    const random = createRandom(building.windowSeed);
    const windows: WindowSlot[] = [];
    const rows = Math.max(2, Math.floor(h / 1.05));
    const addWindow = (wx: number, wy: number, wz: number, ry: number) => {
      if (!random.chance(0.78)) return;
      const threshold = Math.pow(random.next(), 1.35);
      windows.push({
        x: wx,
        y: wy,
        z: wz,
        ry,
        sx: random.range(0.2, 0.32),
        sy: random.range(0.22, 0.34),
        threshold,
        warmth: random.next(),
      });
    };

    if (usesFootprint && building.footprint) {
      const area = building.footprint.reduce((sum, point, index) => {
        const next = building.footprint?.[(index + 1) % building.footprint.length] ?? point;
        return sum + point[0] * next[1] - next[0] * point[1];
      }, 0);
      const outwardSign = area >= 0 ? 1 : -1;

      // OSM buildings use their real footprint, so windows are placed along
      // each polygon edge instead of on an invisible bounding rectangle.
      for (let edgeIndex = 0; edgeIndex < building.footprint.length; edgeIndex++) {
        const start = building.footprint[edgeIndex];
        const end = building.footprint[(edgeIndex + 1) % building.footprint.length];
        const dx = end[0] - start[0];
        const dz = end[1] - start[1];
        const length = Math.hypot(dx, dz);
        if (length < 0.85) continue;

        const nx = (dz / length) * outwardSign;
        const nz = (-dx / length) * outwardSign;
        const ry = Math.atan2(nx, nz);
        const columns = Math.max(1, Math.floor(length / 0.9));

        for (let row = 1; row < rows; row++) {
          const wy = row * (h / rows) - h / 2;
          for (let col = 1; col <= columns; col++) {
            const t = col / (columns + 1);
            const wx = start[0] + dx * t + nx * 0.018;
            const wz = start[1] + dz * t + nz * 0.018;
            addWindow(wx, wy, wz, ry);
          }
        }
      }

      return windows;
    }

    const columnsX = Math.max(2, Math.floor(w / 0.9));
    const columnsZ = Math.max(2, Math.floor(d / 0.9));

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
  }, [building.footprint, building.windowSeed, d, h, usesFootprint, w]);
  const windowLayers = useMemo(() => {
    const layers = [
      { color: '#fff1c6', slots: [] as WindowSlot[] },
      { color: '#ffe0a4', slots: [] as WindowSlot[] },
      { color: '#ffd28f', slots: [] as WindowSlot[] },
    ];

    for (const window of windowSlots) {
      if (window.warmth < 0.34) layers[0].slots.push(window);
      else if (window.warmth < 0.72) layers[1].slots.push(window);
      else layers[2].slots.push(window);
    }

    return layers.filter((layer) => layer.slots.length > 0);
  }, [windowSlots]);

  return (
    <group position={[x, y, z]}>
      {extrudedGeometry ? (
        <>
          <mesh castShadow receiveShadow geometry={extrudedGeometry}>
            <meshStandardMaterial color={building.color} roughness={0.86} />
          </mesh>
          {hasGabledRoof ? <GabledRoof ambience={ambience} building={building} /> : null}
        </>
      ) : (
        <>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color={building.color} roughness={0.86} />
          </mesh>
          {hasGabledRoof ? (
            <GabledRoof ambience={ambience} building={building} />
          ) : (
            <>
              <mesh position={[0, h / 2 + 0.05, 0]} receiveShadow>
                <boxGeometry args={[w + 0.12, 0.1, d + 0.12]} />
                <meshStandardMaterial color={building.roofColor} roughness={0.82} />
              </mesh>
              {roofSnowOpacity > 0.01 ? (
                <mesh position={[0, h / 2 + 0.125, 0]} receiveShadow>
                  <boxGeometry args={[w + 0.08, 0.025, d + 0.08]} />
                  <meshStandardMaterial color="#e4ebef" roughness={0.94} transparent opacity={roofSnowOpacity} depthWrite={false} />
                </mesh>
              ) : null}
            </>
          )}
        </>
      )}
      {windowLayers.map((layer) => (
        <WindowLayer key={layer.color} ambience={ambience} color={layer.color} slots={layer.slots} />
      ))}
      {!usesFootprint &&
        !hasGabledRoof &&
        building.signSides.map((side, index) => (
          <Sign key={`${building.id}-sign-${side}-${index}`} side={side} buildingSize={building.size} ambience={ambience} index={index} />
        ))}
      {projectingSigns.map((spec, index) => (
        <ProjectingSign key={`${building.id}-projecting-sign-${index}`} buildingSize={building.size} ambience={ambience} spec={spec} />
      ))}
      {!usesFootprint && !hasGabledRoof ? <RooftopDetail size={building.size} seed={building.windowSeed + 42} hasStairs={building.hasStairs} /> : null}
      {h >= 9.8 && building.windowSeed % 3 === 0 ? <AviationLight height={h} seed={building.windowSeed} /> : null}
    </group>
  );
}
