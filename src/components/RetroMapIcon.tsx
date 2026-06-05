import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { Group, MeshBasicMaterial, Shape, ShapeGeometry, Vector3 } from 'three';
import { IconAgent, IconOccluder } from './IconCrowd';

type RetroMapIconProps = {
  agent: IconAgent;
  occluders: IconOccluder[];
};

const bodyShape = new Shape();
bodyShape.moveTo(0, -0.32);
bodyShape.lineTo(0.28, 0.18);
bodyShape.lineTo(-0.28, 0.18);
bodyShape.lineTo(0, -0.32);

const bodyGeometry = new ShapeGeometry(bodyShape);

const tempA = new Vector3();
const tempB = new Vector3();
const umbrellaOpenDelay = 0.72;

type AgentSample = {
  hidden: boolean;
  secondsSinceDoorExit?: number;
};

function getLoopDuration(agent: IconAgent) {
  let distance = 0;
  const effectiveSpeed = agent.speed * agent.weatherSpeed;
  for (let i = 0; i < agent.path.points.length; i++) {
    const current = agent.path.points[i];
    const next = agent.path.points[(i + 1) % agent.path.points.length];
    distance += current.position.distanceTo(next.position);
    distance += current.pause ?? 0;
  }
  return distance / effectiveSpeed;
}

function sampleAgent(agent: IconAgent, elapsed: number, output: Vector3): AgentSample {
  const total = getLoopDuration(agent);
  const effectiveSpeed = agent.speed * agent.weatherSpeed;
  let cursor = ((elapsed / total + agent.phase) % 1) * total * effectiveSpeed;
  const points = agent.path.points;
  let hidden = false;
  let secondsSinceDoorExit: number | undefined;

  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const previous = points[(i - 1 + points.length) % points.length];
    const next = points[(i + 1) % points.length];
    const pauseDistance = (current.pause ?? 0) * effectiveSpeed;
    if (cursor < pauseDistance) {
      output.copy(current.position);
      if (!current.hidden && (current.doorPause || previous.hidden)) {
        secondsSinceDoorExit = cursor / effectiveSpeed;
      }
      return { hidden: current.hidden ?? hidden, secondsSinceDoorExit };
    }
    cursor -= pauseDistance;
    const segmentLength = current.position.distanceTo(next.position);
    if (cursor <= segmentLength) {
      const t = segmentLength === 0 ? 0 : cursor / segmentLength;
      output.copy(tempA.copy(current.position).lerp(tempB.copy(next.position), t));
      if (!current.hidden && (current.doorPause || previous.hidden)) {
        secondsSinceDoorExit = ((current.pause ?? 0) * effectiveSpeed + cursor) / effectiveSpeed;
      }
      return { hidden: Boolean(current.hidden || next.hidden || hidden), secondsSinceDoorExit };
    }
    cursor -= segmentLength;
    hidden = Boolean(next.hidden);
  }

  output.copy(points[0].position);
  return { hidden: Boolean(points[0].hidden) };
}

function isInsideBuilding(position: Vector3, occluders: IconOccluder[]) {
  const margin = 0.04;
  return occluders.some(
    (building) =>
      position.y < building.top + 0.08 &&
      Math.abs(position.x - building.x) < building.w / 2 + margin &&
      Math.abs(position.z - building.z) < building.d / 2 + margin,
  );
}

function segmentHitsBuilding(from: Vector3, to: Vector3, building: IconOccluder) {
  const minX = building.x - building.w / 2;
  const maxX = building.x + building.w / 2;
  const minY = 0;
  const maxY = building.top + 0.08;
  const minZ = building.z - building.d / 2;
  const maxZ = building.z + building.d / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  let tMin = 0;
  let tMax = 1;

  const testAxis = (origin: number, direction: number, min: number, max: number) => {
    if (Math.abs(direction) < 0.0001) {
      return origin >= min && origin <= max;
    }
    const inv = 1 / direction;
    let t1 = (min - origin) * inv;
    let t2 = (max - origin) * inv;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    return tMin <= tMax;
  };

  if (!testAxis(from.x, dx, minX, maxX)) return false;
  if (!testAxis(from.y, dy, minY, maxY)) return false;
  if (!testAxis(from.z, dz, minZ, maxZ)) return false;

  return tMin > 0.001 && tMin < 0.985;
}

function isOccludedByBuilding(from: Vector3, to: Vector3, occluders: IconOccluder[]) {
  return occluders.some((building) => segmentHitsBuilding(from, to, building));
}

export function RetroMapIcon({ agent, occluders }: RetroMapIconProps) {
  const groupRef = useRef<Group>(null);
  const headMaterialRef = useRef<MeshBasicMaterial>(null);
  const bodyMaterialRef = useRef<MeshBasicMaterial>(null);
  const umbrellaMaterialRef = useRef<MeshBasicMaterial>(null);
  const shadowMaterialRef = useRef<MeshBasicMaterial>(null);
  const { camera } = useThree();
  const position = useRef(new Vector3());
  const occlusionTarget = useRef(new Vector3());
  const alpha = useRef(1);
  const umbrellaAlpha = useRef(0);
  const isUmbrella = agent.variant === 'umbrella';

  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const sample = sampleAgent(agent, clock.elapsedTime, position.current);
    occlusionTarget.current.copy(position.current);
    occlusionTarget.current.y += isUmbrella ? 0.22 : 0.14;
    const targetVisible =
      !sample.hidden &&
      !isInsideBuilding(position.current, occluders) &&
      !isOccludedByBuilding(camera.position, occlusionTarget.current, occluders);
    const umbrellaVisible =
      isUmbrella && (sample.secondsSinceDoorExit === undefined || sample.secondsSinceDoorExit > umbrellaOpenDelay);
    const targetAlpha = targetVisible ? 1 : 0;
    const fadeSpeed = targetVisible ? 6 : 9;
    alpha.current += (targetAlpha - alpha.current) * Math.min(1, delta * fadeSpeed);
    umbrellaAlpha.current += ((umbrellaVisible ? 1 : 0) - umbrellaAlpha.current) * Math.min(1, delta * 7);
    group.visible = alpha.current > 0.025;
    group.position.copy(position.current);
    group.position.y += isUmbrella ? 0.22 : 0.14;
    group.quaternion.copy(camera.quaternion);
    group.scale.setScalar(agent.scale);

    if (headMaterialRef.current) headMaterialRef.current.opacity = alpha.current;
    if (bodyMaterialRef.current) bodyMaterialRef.current.opacity = alpha.current;
    if (umbrellaMaterialRef.current) umbrellaMaterialRef.current.opacity = alpha.current * umbrellaAlpha.current;
    if (shadowMaterialRef.current) shadowMaterialRef.current.opacity = alpha.current * 0.34;
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.18, 0.02]}>
        <circleGeometry args={[0.17, 14]} />
        <meshBasicMaterial ref={headMaterialRef} color={agent.color} transparent depthWrite={false} />
      </mesh>
      <mesh geometry={bodyGeometry} position={[0, -0.18, 0]}>
        <meshBasicMaterial ref={bodyMaterialRef} color={agent.color} transparent depthWrite={false} />
      </mesh>
      <mesh position={[0, -0.02, -0.01]} scale={[1.2, 1.2, 1]}>
        <circleGeometry args={[0.18, 4]} />
        <meshBasicMaterial ref={shadowMaterialRef} color="#124d91" transparent opacity={0.34} depthWrite={false} />
      </mesh>
      {isUmbrella ? (
        <mesh position={[0, 0.42, 0.03]}>
          <circleGeometry args={[0.26, 10, 0, Math.PI]} />
          <meshBasicMaterial ref={umbrellaMaterialRef} color="#7bbcff" transparent depthWrite={false} />
        </mesh>
      ) : null}
    </group>
  );
}
