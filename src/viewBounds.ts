export type ViewBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export function pointWithinViewBounds(bounds: ViewBounds | undefined, x: number, z: number, padding = 0) {
  if (!bounds) return true;
  return x >= bounds.minX - padding && x <= bounds.maxX + padding && z >= bounds.minZ - padding && z <= bounds.maxZ + padding;
}

export function boxIntersectsViewBounds(
  bounds: ViewBounds | undefined,
  centerX: number,
  centerZ: number,
  width: number,
  depth: number,
  padding = 0,
) {
  if (!bounds) return true;
  const halfW = width / 2 + padding;
  const halfD = depth / 2 + padding;
  return (
    centerX + halfW >= bounds.minX &&
    centerX - halfW <= bounds.maxX &&
    centerZ + halfD >= bounds.minZ &&
    centerZ - halfD <= bounds.maxZ
  );
}

export function segmentIntersectsViewBounds(
  bounds: ViewBounds | undefined,
  start: { x: number; z: number },
  end: { x: number; z: number },
  padding = 0,
) {
  if (!bounds) return true;
  return (
    Math.max(start.x, end.x) >= bounds.minX - padding &&
    Math.min(start.x, end.x) <= bounds.maxX + padding &&
    Math.max(start.z, end.z) >= bounds.minZ - padding &&
    Math.min(start.z, end.z) <= bounds.maxZ + padding
  );
}
