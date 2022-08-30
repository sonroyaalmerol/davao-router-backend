import {lineString, nearestPointOnLine, point} from '@turf/turf';
import constants from '../constants';
import {rearrangeArray} from '../utils/arrays';
import {pointInPolygon} from '../utils/polygon';
import {dotProduct} from '../utils/vectorOperations';
import Point from './point';

export default class Route {
  name: string;
  coordinates: Point[];
  isTricycle: boolean;

  constructor(name: string, coordinates: Point[], isTricycle?: boolean) {
    this.name = name;
    this.coordinates = coordinates;
    this.isTricycle = isTricycle ?? false;
  }

  equals(route: Route) {
    return (
      this.coordinates.filter((coordinate, i) => {
        return !coordinate?.equals(route.coordinates[i]);
      }).length === 0
    );
  }

  isInside(point: Point) {
    if (this.coordinates.length < 3 || !this.isTricycle) {
      return false;
    }
    return pointInPolygon(point, this);
  }

  nearestPointFromRoute(
    tmpPt: Point,
    opts?: {reverse: boolean}
  ): {segment: Route; point: Point} {
    let closestSegment: Route;

    closestSegment = new Route('undefined', []);

    let coordinates = this.coordinates;
    if (opts?.reverse) {
      coordinates = coordinates.slice().reverse();
    }
    let checkingNearest = false;
    for (let i = 0; i < coordinates.length - 1; i++) {
      const segment = new Route(`${this.name} - ${i + 1}`, [
        coordinates[i],
        coordinates[i + 1],
      ]);
      if (!checkingNearest) {
        if (
          segment.distanceFromPoint(tmpPt) <=
          constants.MAXIMUM_WALKABLE_DISTANCE
        ) {
          checkingNearest = true;
          closestSegment = segment;
        }
        continue;
      }
      if (
        segment.distanceFromPoint(tmpPt) <
          closestSegment.distanceFromPoint(tmpPt) ||
        closestSegment.name === 'undefined'
      ) {
        closestSegment = segment;
        continue;
      }

      break;
    }

    if (closestSegment.name === 'undefined') {
      return {
        segment: closestSegment,
        point: new Point([-1, -1]),
      };
    }

    const line = lineString(
      closestSegment.coordinates.map(i => [i.coordinate[1], i.coordinate[0]])
    );

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

  distanceFromPoint(point: Point) {
    let minimumDistance = Infinity;

    for (let i = 0; i < this.coordinates.length - 1; i++) {
      const segment = new Route(`${this.name} - ${i + 1}`, [
        this.coordinates[i],
        this.coordinates[i + 1],
      ]);

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
        }
        continue;
      }

      const c2 = dotProduct(v, v);
      if (c2 <= c1) {
        distance = new Point(p).distanceFrom(new Point(b));
        if (distance < minimumDistance) {
          minimumDistance = distance;
        }
        continue;
      }

      const b2 = c1 / c2;
      const Pb = [a[0] + b2 * v[0], a[1] + b2 * v[1]] as Coordinate;

      distance = new Point(p).distanceFrom(new Point(Pb));

      if (distance < minimumDistance) {
        minimumDistance = distance;
      }
    }

    return minimumDistance;
  }

  totalDistance() {
    if (this.isTricycle) {
      return 0;
    }
    let totalDistance = 0;

    for (let i = 0; i < this.coordinates.length - 1; i++) {
      totalDistance += this.coordinates[i].distanceFrom(
        this.coordinates[i + 1]
      );
    }

    return totalDistance;
  }

  intersects(route: Route) {
    for (let i = 0; i < this.coordinates.length - 1; i++) {
      const segmentA = new Route(`${this.name} - ${i + 1}`, [
        this.coordinates[i],
        this.coordinates[i + 1],
      ]);

      for (let j = 0; j < route.coordinates.length - 1; j++) {
        const segmentB = new Route(`${route.name} - ${j + 1}`, [
          route.coordinates[j],
          route.coordinates[j + 1],
        ]);

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

  isWalkableTo(route: Route) {
    for (let i = 0; i < this.coordinates.length - 1; i++) {
      const segmentA = new Route(`${this.name} - ${i + 1}`, [
        this.coordinates[i],
        this.coordinates[i + 1],
      ]);

      for (let j = 0; j < route.coordinates.length - 1; j++) {
        const segmentB = new Route(`${route.name} - ${j + 1}`, [
          route.coordinates[j],
          route.coordinates[j + 1],
        ]);

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

  differentStartPoint(p: Point, opts?: {reverse: boolean}) {
    const closest = this.nearestPointFromRoute(p, opts);
    if (closest.segment.name === 'undefined') {
      return null;
    }
    // create new "route" with closest point to source as starting point
    let startIndex = 0;
    for (const [i, coord] of this.coordinates.entries()) {
      if (coord.equals(closest.segment.coordinates[1])) {
        startIndex = i;
        break;
      }
    }

    // TODO: observe...
    const rearrangedRoute = new Route(this.name, [
      closest.point,
      ...(rearrangeArray(startIndex, this.coordinates) as Point[]),
    ]);

    // rearrangedRoute.coordinates[0] = closest.point;

    return rearrangedRoute;
  }

  parseFromGeoJSON(geojson: RouteGeoJSON) {
    this.name = geojson.properties.name;
    if (geojson.geometry.type === 'Polygon') {
      const coords = geojson.geometry.coordinates[0] as unknown as Coordinate[];
      this.coordinates = coords.map(
        (coordinate: Coordinate) => new Point([coordinate[1], coordinate[0]])
      );
      this.isTricycle = true;
    } else {
      this.coordinates = geojson.geometry.coordinates.map(
        coordinate => new Point([coordinate[1], coordinate[0]])
      );
    }
  }

  transformToGeoJSON(): RouteGeoJSON {
    if (this.isTricycle) {
      return {
        type: 'Feature',
        properties: {
          name: this.name,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            this.coordinates.map(coordinate => [
              coordinate.coordinate[1],
              coordinate.coordinate[0],
            ]),
          ] as unknown as Coordinate[],
        },
      };
    }
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
