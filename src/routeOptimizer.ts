import Graph from './classes/graph';
import Point from './classes/point';
import Route from './classes/route';
import constants from './constants';
import {floydWarshallPathReconstruction} from './floydWarshall';
import {mergeRoutes} from './utils/helperFunctions';

const routeOptimizer = async (
  tmpSrc: Point,
  tmpDest: Point,
  floydWarshallModel: FloydWarshallExport,
  opts?: {
    priority?: PriorityChoice;
    srcWalkableDistance?: number;
    destWalkableDistance?: number;
  }
) => {
  let src: Point = tmpSrc;
  let dest: Point = tmpDest;

  const srcWalkingDistance =
    opts?.srcWalkableDistance ?? constants.MAXIMUM_WALKABLE_DISTANCE;

  const destWalkingDistance =
    opts?.destWalkableDistance ?? constants.MAXIMUM_WALKABLE_DISTANCE;

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

  const graph = new Graph(
    floydWarshallModel.g.nodes,
    floydWarshallModel.g.edges
  );

  const tricycleRoutes = graph.nodes.filter(r => r.isTricycle);

  let tricycleAreaSrc: Route | null = null;
  let tricycleAreaDest: Route | null = null;
  for (const area of tricycleRoutes) {
    if (area.isInside(src)) {
      tricycleAreaSrc = area;
    }
    if (area.isInside(dest)) {
      tricycleAreaDest = area;
    }

    if (tricycleAreaSrc !== null && tricycleAreaDest !== null) {
      break;
    }
  }

  let sourceRoutes = graph.nodes.filter(route => {
    return route.distanceFromPoint(src) <= srcWalkingDistance;
  });

  if (tricycleAreaSrc !== null) {
    const nearJeepneys = graph.findNeighbors(tricycleAreaSrc);
    sourceRoutes = nearJeepneys;

    for (const coord of tricycleAreaSrc.coordinates) {
      if (
        sourceRoutes.filter(
          r => r.distanceFromPoint(coord) <= constants.MAXIMUM_WALKABLE_DISTANCE
        ).length > 0
      ) {
        src = coord;
        break;
      }
    }
  }

  let tmpDestRoutes = graph.nodes.filter(route => {
    return route.distanceFromPoint(dest) <= destWalkingDistance;
  });

  if (tricycleAreaDest !== null) {
    const nearJeepneys = graph.findNeighbors(tricycleAreaDest);
    tmpDestRoutes = nearJeepneys;

    for (const coord of tricycleAreaDest.coordinates) {
      if (
        tmpDestRoutes.filter(
          r => r.distanceFromPoint(coord) <= constants.MAXIMUM_WALKABLE_DISTANCE
        ).length > 0
      ) {
        dest = coord;
        break;
      }
    }
  }

  const destRoutes = tmpDestRoutes.filter(
    route => sourceRoutes.filter(src => src.equals(route)).length === 0
  );

  const sameRoutes = sourceRoutes.filter(
    route => tmpDestRoutes.filter(dRoute => route.equals(dRoute)).length > 0
  );

  const outputRoutes: Route[][] = [];

  for (const oneRoute of sameRoutes) {
    const merged = mergeRoutes(
      src,
      dest,
      [oneRoute],
      tricycleAreaSrc,
      tricycleAreaDest,
      srcWalkingDistance,
      destWalkingDistance
    );

    if (merged === null) {
      continue;
    }

    if (
      merged[0].distanceFromPoint(src) <= srcWalkingDistance &&
      merged[merged.length - 1].distanceFromPoint(dest) <= destWalkingDistance
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

      const merged = mergeRoutes(
        src,
        dest,
        trip,
        tricycleAreaSrc,
        tricycleAreaDest,
        srcWalkingDistance,
        destWalkingDistance
      );

      if (merged === null) {
        continue;
      }

      if (
        merged[0].distanceFromPoint(src) <= srcWalkingDistance &&
        merged[merged.length - 1].distanceFromPoint(dest) <= destWalkingDistance
      ) {
        outputRoutes.push(merged);
      }
    }
  }

  let priority: PriorityChoice = 'FARE';
  if (opts?.priority) {
    priority = opts.priority;
  }

  outputRoutes.sort((a, b) => {
    let totalCostA = 0;
    let totalCostB = 0;
    if (priority === 'FARE' || priority === 'TRANSFERS') {
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
    } else if (priority === 'DISTANCE') {
      for (let i = 0; i < a.length; i++) {
        const routeA = a[i];

        if (i === 0) {
          totalCostA += routeA.coordinates[0].distanceFrom(src);
        } else if (i === a.length - 1) {
          totalCostA +=
            routeA.coordinates[routeA.coordinates.length - 1].distanceFrom(
              dest
            );
        }

        totalCostA += routeA.totalDistance();
        if (i + 1 < a.length) {
          totalCostA += a[i + 1].coordinates[0].distanceFrom(
            routeA.coordinates[routeA.coordinates.length - 1]
          );
        }
      }

      for (let i = 0; i < b.length; i++) {
        const routeB = b[i];

        if (i === 0) {
          totalCostB += routeB.coordinates[0].distanceFrom(src);
        } else if (i === b.length - 1) {
          totalCostB +=
            routeB.coordinates[routeB.coordinates.length - 1].distanceFrom(
              dest
            );
        }

        totalCostB += routeB.totalDistance();
        if (i + 1 < b.length) {
          totalCostB += b[i + 1].coordinates[0].distanceFrom(
            routeB.coordinates[routeB.coordinates.length - 1]
          );
        }
      }
    }

    if (priority === 'DISTANCE') {
      if (
        Math.abs(totalCostA - totalCostB) < constants.MAXIMUM_WALKABLE_DISTANCE
      ) {
        return a.length - b.length;
      }
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

  return {
    source: sourceRoutes.filter(s => !s.isTricycle),
    destination: destRoutes.filter(s => !s.isTricycle),
    output: collections,
  };
};

export default routeOptimizer;
