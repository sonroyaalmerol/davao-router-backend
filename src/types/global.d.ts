export {};

import Graph from '../classes/graph';
import type Route from '../classes/route';

declare global {
  type Coordinate = [number, number];

  type RouteGeoJSON = {
    type: 'Feature';
    properties: {
      name: string;
    };
    geometry: {
      type: 'LineString';
      coordinates: Coordinate[];
    };
  };

  type FloydWarshallExport = {
    g: Graph;
    matrix: number[][];
    next: (Route | null)[][];
  };

  type GeoJSONCollection = {
    type: 'FeatureCollection';
    features: RouteGeoJSON[];
  };

  type Edge = {
    u: Route;
    v: Route;
    weight: number;
  };
}
