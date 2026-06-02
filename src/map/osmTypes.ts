export type OsmNode = {
  type: 'node';
  id: number;
  lat: number;
  lon: number;
};

export type OsmWay = {
  type: 'way';
  id: number;
  nodes: number[];
  tags?: Record<string, string>;
};

export type OsmRelation = {
  type: 'relation';
  id: number;
  tags?: Record<string, string>;
  members?: Array<{
    type: string;
    ref: number;
    role: string;
  }>;
};

export type OsmElement = OsmNode | OsmWay | OsmRelation;

export type OsmPayload = {
  elements: OsmElement[];
  bbox?: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
  center?: {
    lat: number;
    lon: number;
  };
  metersPerUnit?: number;
};
