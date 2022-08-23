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
    let route = oneRoute.splitFromPointToPoint(src, dest);
    const reversedTmpRoute = oneRoute.splitFromPointToPoint(src, dest, {
      reverse: true,
    });

    if (route.totalDistance() > reversedTmpRoute.totalDistance()) {
      route = reversedTmpRoute;
    }

    if (route.totalDistance() < oneRoute.totalDistance() * 0.5) {
      sourceRoutes = sourceRoutes.filter(route => !route.equals(oneRoute));
    }

    outputRoutes.push([route]);
  }

  console.log(`Number of possible Source Routes: ${sourceRoutes.length}`);
  console.log(`Number of possible Destination Routes: ${destRoutes.length}`);
  for (const sourceRoute of sourceRoutes) {
    for (const destRoute of destRoutes) {
      const trip = floydWarshallPathReconstruction(
        sourceRoute,
        destRoute,
        floydWarshallModel
      );

      const merged = mergeRoutes(src, dest, trip);

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
