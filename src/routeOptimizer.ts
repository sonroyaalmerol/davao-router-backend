import {readFileSync} from 'fs';
import Point from './classes/point';
import Route from './classes/route';
import constants from './constants';
import {floydWarshallPathReconstruction} from './floydWarshall';
import {mergeRoutes} from './utils/helperFunctions';

const routeOptimizer = async (
  src: Point,
  dest: Point,
  opts?: {priority?: PriorityChoice}
) => {
  const floydWarshallModel: FloydWarshallExport = JSON.parse(
    readFileSync('floyd-warshall-davao.json', 'utf-8')
  );

  floydWarshallModel.g.nodes = floydWarshallModel.g.nodes.map(
    rawNode =>
      new Route(
        rawNode.name,
        rawNode.coordinates.map(point => new Point(point.coordinate)),
        rawNode.isTricycle
      )
  );

  floydWarshallModel.g.edges = floydWarshallModel.g.edges.map(rawEdge => ({
    u: new Route(
      rawEdge.u.name,
      rawEdge.u.coordinates.map(point => new Point(point.coordinate)),
      rawEdge.u.isTricycle
    ),
    v: new Route(
      rawEdge.v.name,
      rawEdge.v.coordinates.map(point => new Point(point.coordinate)),
      rawEdge.v.isTricycle
    ),
    weight: rawEdge.weight,
  }));

  const sourceRoutes = floydWarshallModel.g.nodes.filter(route => {
    return (
      route.distanceFromPoint(src) <= constants.MAXIMUM_WALKABLE_DISTANCE ||
      route.isInside(src)
    );
  });

  const tmpDestRoutes = floydWarshallModel.g.nodes.filter(route => {
    return (
      route.distanceFromPoint(dest) <= constants.MAXIMUM_WALKABLE_DISTANCE ||
      route.isInside(dest)
    );
  });

  const destRoutes = tmpDestRoutes.filter(
    route => sourceRoutes.filter(src => src.equals(route)).length === 0
  );

  const sameRoutes = sourceRoutes.filter(
    route => tmpDestRoutes.filter(dRoute => route.equals(dRoute)).length > 0
  );

  const outputRoutes: Route[][] = [];

  for (const oneRoute of sameRoutes) {
    const merged = mergeRoutes(src, dest, [oneRoute]);

    if (merged === null) {
      continue;
    }

    if (
      merged[0].distanceFromPoint(src) <= constants.MAXIMUM_WALKABLE_DISTANCE &&
      merged[merged.length - 1].distanceFromPoint(dest) <=
        constants.MAXIMUM_WALKABLE_DISTANCE
    ) {
      outputRoutes.push(merged);
    }
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

      if (merged === null) {
        continue;
      }

      if (
        merged[0].distanceFromPoint(src) <=
          constants.MAXIMUM_WALKABLE_DISTANCE &&
        merged[merged.length - 1].distanceFromPoint(dest) <=
          constants.MAXIMUM_WALKABLE_DISTANCE
      ) {
        outputRoutes.push(merged);
      }
    }
  }

  let priority: PriorityChoice = 'Distance';
  if (opts?.priority) {
    priority = opts.priority;
  }

  outputRoutes.sort((a, b) => {
    let totalCostA = 0;
    let totalCostB = 0;
    if (priority === 'Fare') {
      for (const routeA of a) {
        if (routeA.isTricycle) {
          totalCostA += constants.TRICYCLE_FARE;
        } else {
          totalCostA += constants.BASE_FARE;
          totalCostA += routeA.totalDistance() * constants.FARE_PER_KILOMETER;
        }
      }

      for (const routeB of b) {
        if (routeB.isTricycle) {
          totalCostB += constants.TRICYCLE_FARE;
        } else {
          totalCostB += constants.BASE_FARE;
          totalCostB += routeB.totalDistance() * constants.FARE_PER_KILOMETER;
        }
      }
    } else if (priority === 'Distance') {
      for (const routeA of a) {
        totalCostA += routeA.totalDistance();
      }

      for (const routeB of b) {
        totalCostB += routeB.totalDistance();
      }
    } else if (priority === 'NumberOfTransfers') {
      totalCostA += a.length;
      totalCostB += b.length;
    }
    return totalCostA - totalCostB;
  });

  /*
  outputRoutes = outputRoutes.filter(r => {
    return (
      r[0].distanceFromPoint(src) <= constants.MAXIMUM_WALKABLE_DISTANCE &&
      r[r.length - 1].distanceFromPoint(dest) <=
        constants.MAXIMUM_WALKABLE_DISTANCE
    );
  });
  */

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
