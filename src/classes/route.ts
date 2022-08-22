import {lineString, nearestPointOnLine, point} from '@turf/turf';
import constants from '../constants';
import {rearrangeArray} from '../utils/arrays';
import {dotProduct} from '../utils/vectorOperations';
import Point from './point';

export default class Route {
  name: string;
  coordinates: Point[];

  constructor(name: string, coordinates: Point[]) {
    this.name = name;
    this.coordinates = coordinates;
  }

  equals(route: Route) {
    return (
      this.coordinates.filter((coordinate, i) => {
        return !coordinate?.equals(route.coordinates[i]);
      }).length === 0
    );
  }

  nearestPointFromRoute(tmpPt: Point): {segment: Route; point: Point} {
    let line = lineString(
      this.coordinates.map(i => [i.coordinate[1], i.coordinate[0]])
    );

    let closestSegment: Route;

    closestSegment = new Route('undefined', []);
    for (const segment of this.getArrayOfLineSegments()) {
      if (
        segment.distanceFromPoint(tmpPt) <= constants.MAXIMUM_WALKABLE_DISTANCE
      ) {
        line = lineString(
          segment.coordinates.map(i => [i.coordinate[1], i.coordinate[0]])
        );
        closestSegment = segment;
        break;
      }
    }
    const pt = point([tmpPt.coordinate[1], tmpPt.coordinate[0]]);
    const snapped = nearestPointOnLine(line, pt, {units: 'kilometers'});

    return {
      segment: closestSegment,
      point: new Point([
        snapped.geometry.coordinates[1],
        snapped.geometry.coordinates[0],
      ]),
    };
  }

  distanceFromPoint(point: Point, includeNearestSegment?: boolean) {
    if (includeNearestSegment === undefined) {
      includeNearestSegment = false;
    }

    let minimumDistance = Infinity;
    let lastSegment: Route | null = null;

    this.getArrayOfLineSegments().forEach(segment => {
      let distance = Infinity;

      const a = segment.coordinates[0].coordinate;
      const b = segment.coordinates[1].coordinate;
      const p = point.coordinate;

      const v = [b[0] - a[0], b[1] - a[1]];
      const w = [p[0] - a[0], p[1] - a[1]];

      const c1 = dotProduct(w, v);
      if (c1 <= 0) {
        distance = new Point(p).distanceFrom(new Point(a));
        if (distance < minimumDistance) {
          minimumDistance = distance;
          lastSegment = segment;
        }
        return;
      }

      const c2 = dotProduct(v, v);
      if (c2 <= c1) {
        distance = new Point(p).distanceFrom(new Point(b));
        if (distance < minimumDistance) {
          minimumDistance = distance;
          lastSegment = segment;
        }
        return;
      }

      const b2 = c1 / c2;
      const Pb = [a[0] + b2 * v[0], a[1] + b2 * v[1]] as Coordinate;

      distance = new Point(p).distanceFrom(new Point(Pb));

      if (distance < minimumDistance) {
        minimumDistance = distance;
        lastSegment = segment;
      }
    });

    if (includeNearestSegment) {
      return {minimumDistance, lastSegment};
    }

    return minimumDistance;
  }

  totalDistance() {
    let totalDistance = 0;

    this.getArrayOfLineSegments().forEach(segment => {
      totalDistance += segment.coordinates[0].distanceFrom(
        segment.coordinates[1]
      );
    });

    return totalDistance;
  }

  intersects(route: Route) {
    const thisSegments = this.getArrayOfLineSegments();
    const routeSegment = route.getArrayOfLineSegments();
    for (let i = 0; i < thisSegments.length; i++) {
      for (let j = 0; j < routeSegment.length; j++) {
        const segmentA = thisSegments[i];
        const segmentB = routeSegment[j];

        const a = segmentA.coordinates[0].coordinate[0];
        const b = segmentA.coordinates[0].coordinate[1];
        const c = segmentA.coordinates[1].coordinate[0];
        const d = segmentA.coordinates[1].coordinate[1];

        const p = segmentB.coordinates[0].coordinate[0];
        const q = segmentB.coordinates[0].coordinate[1];
        const r = segmentB.coordinates[1].coordinate[0];
        const s = segmentB.coordinates[1].coordinate[1];

        let gamma, lambda;
        const det = (c - a) * (s - q) - (r - p) * (d - b);
        if (det !== 0) {
          lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
          gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
          return 0 < lambda && lambda < 1 && 0 < gamma && gamma < 1;
        }
      }
    }

    return false;
  }

  minimumDistanceFromRoute(route: Route) {
    let minimumDistance = Infinity;
    const thisSegments = this.getArrayOfLineSegments();
    const routeSegments = route.getArrayOfLineSegments();
    for (const segmentA of thisSegments) {
      for (const segmentB of routeSegments) {
        if (segmentA.intersects(segmentB)) {
          return 0;
        }

        const a = route.distanceFromPoint(segmentA.coordinates[0]) as number;
        const b = route.distanceFromPoint(segmentA.coordinates[1]) as number;
        const c = this.distanceFromPoint(segmentB.coordinates[0]) as number;
        const d = this.distanceFromPoint(segmentB.coordinates[1]) as number;

        minimumDistance = Math.min(a, b, c, d, minimumDistance);
      }
    }

    return minimumDistance;
  }

  isWalkableTo(route: Route) {
    const thisSegments = this.getArrayOfLineSegments();
    const routeSegments = route.getArrayOfLineSegments();
    for (const segmentA of thisSegments) {
      for (const segmentB of routeSegments) {
        if (segmentA.intersects(segmentB)) {
          return true;
        }

        const a = route.distanceFromPoint(segmentA.coordinates[0]) as number;
        const b = route.distanceFromPoint(segmentA.coordinates[1]) as number;
        const c = this.distanceFromPoint(segmentB.coordinates[0]) as number;
        const d = this.distanceFromPoint(segmentB.coordinates[1]) as number;

        if (Math.min(a, b, c, d) < constants.MAXIMUM_WALKABLE_DISTANCE) {
          return true;
        }
      }
    }

    return false;
  }

  getArrayOfPoints() {
    return this.coordinates;
  }

  differentStartPoint(p: Point) {
    const closest = this.nearestPointFromRoute(p);

    // create new "route" with closest point to source as starting point
    let startIndex = 0;
    for (const [i, coord] of this.coordinates.entries()) {
      if (coord.equals(closest.segment.coordinates[1])) {
        startIndex = i;
        break;
      }
    }

    const rearrangedRoute = new Route(this.name, [
      closest.point,
      ...(rearrangeArray(startIndex, this.coordinates) as Point[]),
    ]);

    return rearrangedRoute;
  }

  splitFromPointToPoint(p1: Point, p2: Point) {
    const rearrangedRoute = this.differentStartPoint(p1);

    const closest2 = rearrangedRoute.nearestPointFromRoute(p2);

    let endIndex = 0;
    for (const [i, coord] of rearrangedRoute.coordinates.entries()) {
      if (coord.equals(closest2.segment.coordinates[1])) {
        endIndex = i;
        break;
      }
    }

    const newRoute = new Route(
      this.name,
      rearrangedRoute.coordinates.slice(0, endIndex + 1)
    );

    return newRoute;
  }

  splitFromSourceToPoint(p: Point) {
    const closest = this.nearestPointFromRoute(p);

    let endIndex = 0;
    for (const [i, coord] of this.coordinates.entries()) {
      if (coord.equals(closest.segment.coordinates[1])) {
        endIndex = i;
        break;
      }
    }

    const newRoute = new Route(
      this.name,
      this.coordinates.slice(0, endIndex + 1)
    );

    return newRoute;
  }

  getArrayOfLineSegments() {
    const segments: Route[] = [];
    for (let i = 0; i < this.coordinates.length - 1; i++) {
      segments.push(
        new Route(`${this.name} - ${i + 1}`, [
          this.coordinates[i],
          this.coordinates[i + 1],
        ])
      );
    }

    return segments;
  }

  parseFromGeoJSON(geojson: RouteGeoJSON) {
    this.name = geojson.properties.name;
    this.coordinates = geojson.geometry.coordinates.map(
      coordinate => new Point([coordinate[1], coordinate[0]])
    );
  }

  transformToGeoJSON(): RouteGeoJSON {
    return {
      type: 'Feature',
      properties: {
        name: this.name,
      },
      geometry: {
        type: 'LineString',
        coordinates: this.coordinates.map(coordinate => [
          coordinate.coordinate[1],
          coordinate.coordinate[0],
        ]),
      },
    };
  }
}
