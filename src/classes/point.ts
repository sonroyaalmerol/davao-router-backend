import {degreesToRadians} from '../utils/degrees';

export default class Point {
  coordinate: Coordinate;

  constructor(coord: Coordinate) {
    this.coordinate = coord;
  }

  equals(point: Point) {
    return (
      this?.coordinate[0] === point?.coordinate[0] &&
      this?.coordinate[1] === point?.coordinate[1]
    );
  }

  distanceFrom(point: Point, isDegree?: boolean) {
    if (isDegree !== undefined) {
      isDegree = false;
    }

    // Haversine Formula
    const EARTH_RADIUS = 6371; // in kilometers

    const latDifference = degreesToRadians(
      this.coordinate[0] - point.coordinate[0]
    );
    const lonDifference = degreesToRadians(
      this.coordinate[1] - point.coordinate[1]
    );

    const a =
      Math.pow(Math.sin(latDifference / 2), 2) +
      Math.cos(degreesToRadians(this.coordinate[0])) *
        Math.cos(degreesToRadians(point.coordinate[0])) *
        Math.pow(Math.sin(lonDifference / 2), 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    if (isDegree) {
      return c * (360 / (2 * Math.PI));
    }

    return c * EARTH_RADIUS;
  }
}
