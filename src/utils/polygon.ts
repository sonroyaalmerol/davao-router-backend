import Point from '../classes/point';
import Route from '../classes/route';

const pointInPolygon = (p: Point, polygon: Route) => {
  let ii = 0;
  let k = 0;
  let f = 0;
  let u1 = 0;
  let v1 = 0;
  let u2 = 0;
  let v2 = 0;
  let currentP = null;
  let nextP = null;

  const x = p.coordinate[0];
  const y = p.coordinate[1];

  ii = 0;
  const contourLen = polygon.coordinates.length - 1;
  const contour = polygon.coordinates;

  currentP = contour[0];
  if (
    currentP.coordinate[0] !== contour[contourLen].coordinate[0] &&
    currentP.coordinate[1] !== contour[contourLen].coordinate[1]
  ) {
    throw new Error('First and last coordinates in a ring must be the same');
  }

  u1 = currentP.coordinate[0] - x;
  v1 = currentP.coordinate[1] - y;

  for (ii; ii < contourLen; ii++) {
    nextP = contour[ii + 1];

    v2 = nextP.coordinate[1] - y;

    if ((v1 < 0 && v2 < 0) || (v1 > 0 && v2 > 0)) {
      currentP = nextP;
      v1 = v2;
      u1 = currentP.coordinate[0] - x;
      continue;
    }

    u2 = nextP.coordinate[0] - p.coordinate[0];

    if (v2 > 0 && v1 <= 0) {
      f = u1 * v2 - u2 * v1;
      if (f > 0) k = k + 1;
      else if (f === 0) return true;
    } else if (v1 > 0 && v2 <= 0) {
      f = u1 * v2 - u2 * v1;
      if (f < 0) k = k + 1;
      else if (f === 0) return true;
    } else if (v2 === 0 && v1 < 0) {
      f = u1 * v2 - u2 * v1;
      if (f === 0) return true;
    } else if (v1 === 0 && v2 < 0) {
      f = u1 * v2 - u2 * v1;
      if (f === 0) return true;
    } else if (v1 === 0 && v2 === 0) {
      if (u2 <= 0 && u1 >= 0) {
        return true;
      } else if (u1 <= 0 && u2 >= 0) {
        return true;
      }
    }
    currentP = nextP;
    v1 = v2;
    u1 = u2;
  }

  if (k % 2 === 0) return false;
  return true;
};

export {pointInPolygon};
