import { OsmElement, OsmPayload } from './osmTypes';

export type ChunkBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type OsmChunkManifestEntry = {
  id: string;
  path: string;
  bounds: ChunkBounds;
  elementCount: number;
  wayCount: number;
};

export type OsmChunkManifest = {
  version: 1;
  sourceName: string;
  source?: string;
  fetchedAt?: string;
  bbox: NonNullable<OsmPayload['bbox']>;
  center: NonNullable<OsmPayload['center']>;
  metersPerUnit: number;
  chunkSizeUnits: number;
  chunks: OsmChunkManifestEntry[];
};

export type OsmChunkPayload = OsmPayload & {
  chunkId: string;
  bounds: ChunkBounds;
};

export function expandBounds(bounds: ChunkBounds, padding: number): ChunkBounds {
  return {
    minX: bounds.minX - padding,
    maxX: bounds.maxX + padding,
    minZ: bounds.minZ - padding,
    maxZ: bounds.maxZ + padding,
  };
}

export function boundsIntersect(a: ChunkBounds, b: ChunkBounds) {
  return a.maxX >= b.minX && a.minX <= b.maxX && a.maxZ >= b.minZ && a.minZ <= b.maxZ;
}

export function chunksForBounds(manifest: OsmChunkManifest, bounds: ChunkBounds, preloadPadding = manifest.chunkSizeUnits * 0.85) {
  const padded = expandBounds(bounds, preloadPadding);
  return manifest.chunks.filter((chunk) => boundsIntersect(chunk.bounds, padded));
}

export function mergeOsmChunks(manifest: OsmChunkManifest, chunks: OsmChunkPayload[]): OsmPayload {
  const elements = new Map<string, OsmElement>();
  for (const chunk of chunks) {
    for (const element of chunk.elements ?? []) {
      elements.set(`${element.type}:${element.id}`, element);
    }
  }

  return {
    bbox: manifest.bbox,
    center: manifest.center,
    metersPerUnit: manifest.metersPerUnit,
    elements: [...elements.values()],
  };
}
