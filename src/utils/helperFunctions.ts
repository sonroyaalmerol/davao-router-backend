import Point from '../classes/point';
import Route from '../classes/route';

const mergeRoutes = (src: Point, dest: Point, routes: Route[]) => {
  const outputRoutes: Route[] = [];
  let initPoint = src;
  for (let i = 0; i < routes.length; i++) {
    const routeA = routes[i].differentStartPoint(initPoint);
    let routeB: Route | null = null;

    if (i + 1 < routes.length) {
      routeB = routes[i + 1];
    }

    if (routeB === null) {
      const tmpLastTrip = routeA.splitFromSourceToPoint(dest);
      const tmpLastTripReversed = routes[i]
        .differentStartPoint(initPoint, {reverse: true})
        .splitFromSourceToPoint(dest);

      if (tmpLastTrip.totalDistance() < tmpLastTripReversed.totalDistance()) {
        outputRoutes.push(tmpLastTrip);
      } else {
        outputRoutes.push(tmpLastTripReversed);
      }

      break;
    }

    let done = false;
    for (let x = 0; x < routeA.coordinates.length - 1; x++) {
      if (done) break;
      const segmentA = new Route(`${routeA.name} - ${x + 1}`, [
        routeA.coordinates[x],
        routeA.coordinates[x + 1],
      ]);
      for (let y = 0; y < routeB.coordinates.length - 1; y++) {
        const segmentB = new Route(`${routeB.name} - ${y + 1}`, [
          routeB.coordinates[y],
          routeB.coordinates[y + 1],
        ]);

        if (segmentA.isWalkableTo(segmentB)) {
          let tmpTripRoute = routeA.splitFromSourceToPoint(
            segmentB.coordinates[0]
          );
          const tmpTripRouteReversed = routes[i]
            .differentStartPoint(initPoint, {reverse: true})
            .splitFromSourceToPoint(segmentB.coordinates[0]);

          if (
            tmpTripRoute.totalDistance() > tmpTripRouteReversed.totalDistance()
          ) {
            tmpTripRoute = tmpTripRouteReversed;
          }

          if (tmpTripRoute.coordinates.length > 1) {
            initPoint = segmentB.coordinates[0];
            outputRoutes.push(tmpTripRoute);
            done = true;
            break;
          }
        }
      }
    }
  }

  return outputRoutes;
};

export {mergeRoutes};
