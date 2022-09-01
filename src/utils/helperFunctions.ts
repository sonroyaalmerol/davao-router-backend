import Point from '../classes/point';
import Route from '../classes/route';
import constants from '../constants';

const mergeRoutes = (
  src: Point,
  dest: Point,
  routes: Route[],
  srcTricycleArea?: Route | null,
  destTricycleArea?: Route | null,
  walkableDistance?: number
) => {
  const outputRoutes: Route[] = [];

  const walkingDistance =
    walkableDistance ?? constants.MAXIMUM_WALKABLE_DISTANCE;

  if (srcTricycleArea) {
    outputRoutes.push(srcTricycleArea);
  }
  let initPoint = src;
  for (let i = 0; i < routes.length; i++) {
    const routeA = routes[i].differentStartPoint(initPoint, {
      walkableDistance: walkingDistance,
    });
    const routeAReverse = routes[i].differentStartPoint(initPoint, {
      reverse: true,
      walkableDistance: walkingDistance,
    });

    if (routeA === null || routeAReverse === null) {
      return null;
    }

    let routeB: Route | null = null;

    if (i + 1 < routes.length) {
      routeB = routes[i + 1];
    }

    const fRoute = new Route(`${routeA.name}`, []);
    const rRoute = new Route(`${routeA.name}`, []);
    let fDone = false;
    let rDone = false;

    let fChecking = false;
    let rChecking = false;
    let fClosestSegment: Route | null = null;
    let rClosestSegment: Route | null = null;

    for (let x = 0; x < routeA.coordinates.length - 1; x++) {
      if (fDone && rDone) {
        if (fRoute.totalDistance() < rRoute.totalDistance()) {
          if (!routes[i].isTricycle) {
            outputRoutes.push(fRoute);
          }
          initPoint = fRoute.coordinates[fRoute.coordinates.length - 1];
        } else {
          if (!routes[i].isTricycle) {
            outputRoutes.push(rRoute);
          }
          initPoint = rRoute.coordinates[rRoute.coordinates.length - 1];
        }
        break;
      }

      const fSegment = new Route(`${routeA.name} - ${x + 1}`, [
        routeA.coordinates[x],
        routeA.coordinates[x + 1],
      ]);
      const rSegment = new Route(`${routeA.name} - ${x + 1}`, [
        routeAReverse.coordinates[x],
        routeAReverse.coordinates[x + 1],
      ]);

      if (routeB === null) {
        if (!fDone) {
          fRoute.coordinates.push(routeA.coordinates[x]);

          if (!fChecking) {
            if (
              fSegment.distanceFromPoint(dest) <=
              constants.MAXIMUM_WALKABLE_DISTANCE
            ) {
              fClosestSegment = fSegment;
              fChecking = true;
            }
          } else {
            if (fClosestSegment !== null) {
              if (
                fSegment.distanceFromPoint(dest) >
                fClosestSegment.distanceFromPoint(dest)
              ) {
                fRoute.coordinates[fRoute.coordinates.length - 1] =
                  fClosestSegment.nearestPointFromRoute(dest).point;
                fDone = true;
              } else {
                fClosestSegment = fSegment;
              }
            }
          }
        }
        if (!rDone) {
          rRoute.coordinates.push(routeAReverse.coordinates[x]);

          if (!rChecking) {
            if (
              rSegment.distanceFromPoint(dest) <=
              constants.MAXIMUM_WALKABLE_DISTANCE
            ) {
              rClosestSegment = rSegment;
              rChecking = true;
            }
          } else {
            if (rClosestSegment !== null) {
              if (
                rSegment.distanceFromPoint(dest) >
                rClosestSegment.distanceFromPoint(dest)
              ) {
                rRoute.coordinates[rRoute.coordinates.length - 1] =
                  rClosestSegment.nearestPointFromRoute(dest).point;
                rDone = true;
              } else {
                rClosestSegment = rSegment;
              }
            }
          }
        }
      } else {
        for (let y = 0; y < routeB.coordinates.length - 1; y++) {
          const bSegment = new Route(`${routeB.name} - ${y + 1}`, [
            routeB.coordinates[y],
            routeB.coordinates[y + 1],
          ]);

          if (!fDone) {
            fRoute.coordinates.push(routeA.coordinates[x]);

            if (fSegment.isWalkableTo(bSegment)) {
              fRoute.coordinates.push(routeA.coordinates[x + 1]);
              fDone = true;
            }
          }
          if (!rDone) {
            rRoute.coordinates.push(routeAReverse.coordinates[x]);

            if (rSegment.isWalkableTo(bSegment)) {
              rRoute.coordinates.push(routeAReverse.coordinates[x + 1]);
              rDone = true;
            }
          }

          if (fDone && rDone) {
            break;
          }
        }
      }
    }
  }

  if (destTricycleArea) {
    outputRoutes.push(destTricycleArea);
  }

  return outputRoutes;
};

export {mergeRoutes};
