import {readFileSync} from 'fs';
import Point from './classes/point';
import Route from './classes/route';
import constants from './constants';
import {floydWarshallPathReconstruction} from './floydWarshall';
import {mergeRoutes} from './utils/helperFunctions';

const routeOptimizer = async (src: Point, dest: Point) => {
  const floydWarshallModel: FloydWarshallExport = JSON.parse(
    readFileSync('floyd-warshall-davao.json', 'utf-8')
  );

  floydWarshallModel.g.nodes = floydWarshallModel.g.nodes.map(
    rawNode =>
      new Route(
        rawNode.name,
        rawNode.coordinates.map(point => new Point(point.coordinate))
      )
  );

  floydWarshallModel.g.edges = floydWarshallModel.g.edges.map(rawEdge => ({
    u: new Route(
      rawEdge.u.name,
      rawEdge.u.coordinates.map(point => new Point(point.coordinate))
    ),
    v: new Route(
      rawEdge.v.name,
      rawEdge.v.coordinates.map(point => new Point(point.coordinate))
    ),
    weight: rawEdge.weight,
  }));

  let sourceRoutes = floydWarshallModel.g.nodes.filter(route => {
    return route.distanceFromPoint(src) <= constants.MAXIMUM_WALKABLE_DISTANCE;
  });

  const tmpDestRoutes = floydWarshallModel.g.nodes.filter(route => {
    return route.distanceFromPoint(dest) <= constants.MAXIMUM_WALKABLE_DISTANCE;
  });

  const destRoutes = tmpDestRoutes.filter(
    route => sourceRoutes.filter(src => src.equals(route)).length === 0
  );

  const sameRoutes = sourceRoutes.filter(
    route => tmpDestRoutes.filter(dRoute => route.equals(dRoute)).length > 0
  );

  const outputRoutes: Route[][] = [];

  for (const oneRoute of sameRoutes) {
    const tmpRoute = oneRoute.splitFromPointToPoint(src, dest);

    if (tmpRoute.totalDistance() < oneRoute.totalDistance() * 0.5) {
      sourceRoutes = sourceRoutes.filter(route => !route.equals(oneRoute));
    }

    if (tmpRoute.totalDistance() < src.distanceFrom(dest)) {
      continue;
    }

    outputRoutes.push([tmpRoute]);
  }

  for (const sourceRoute of sourceRoutes) {
    for (const destRoute of destRoutes) {
      const trip = floydWarshallPathReconstruction(
        sourceRoute,
        destRoute,
        floydWarshallModel
      );

      const merged = mergeRoutes(src, dest, trip);

      if (
        merged[0].coordinates[0].distanceFrom(src) >
        constants.MAXIMUM_WALKABLE_DISTANCE
      ) {
        continue;
      }

      if (
        merged[merged.length - 1].coordinates[
          merged[merged.length - 1].coordinates.length - 1
        ].distanceFrom(dest) > constants.MAXIMUM_WALKABLE_DISTANCE
      ) {
        continue;
      }

      if (
        merged.filter(
          route =>
            route.totalDistance() > src.distanceFrom(dest) * 2 ||
            route.coordinates.length === 1
        ).length > 0
      ) {
        continue;
      }

      outputRoutes.push(merged);
    }
  }

  outputRoutes.sort((a, b) => {
    let totalCostA = 0;
    for (const routeA of a) {
      totalCostA += constants.BASE_FARE;
      totalCostA += routeA.totalDistance() * constants.FARE_PER_KILOMETER;
    }

    let totalCostB = 0;
    for (const routeB of b) {
      totalCostB += constants.BASE_FARE;
      totalCostB += routeB.totalDistance() * constants.FARE_PER_KILOMETER;
    }

    return totalCostA - totalCostB;
  });

  const collections: GeoJSONCollection[] = [];
  for (const route of outputRoutes) {
    const toPrint: GeoJSONCollection = {
      type: 'FeatureCollection',
      features: [],
    };

    toPrint.features = route.map(i => i.transformToGeoJSON());

    collections.push(toPrint);
  }

  return collections;
};

export default routeOptimizer;
