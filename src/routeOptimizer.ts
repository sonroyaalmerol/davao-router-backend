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
  opts?: {priority?: PriorityChoice; walkableDistance?: number}
) => {
  let src: Point = tmpSrc;
  let dest: Point = tmpDest;

  const walkingDistance =
    opts?.walkableDistance ?? constants.MAXIMUM_WALKABLE_DISTANCE;

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
    return route.distanceFromPoint(src) <= walkingDistance;
  });

  if (tricycleAreaSrc !== null) {
    const nearJeepneys = graph.findNeighbors(tricycleAreaSrc);
    sourceRoutes = nearJeepneys;

    for (const coord of tricycleAreaSrc.coordinates) {
      if (
        sourceRoutes.filter(r => r.distanceFromPoint(coord) <= walkingDistance)
          .length > 0
      ) {
        src = coord;
        break;
      }
    }
  }

  let tmpDestRoutes = graph.nodes.filter(route => {
    return route.distanceFromPoint(dest) <= walkingDistance;
  });

  if (tricycleAreaDest !== null) {
    const nearJeepneys = graph.findNeighbors(tricycleAreaDest);
    tmpDestRoutes = nearJeepneys;

    for (const coord of tricycleAreaDest.coordinates) {
      if (
        tmpDestRoutes.filter(r => r.distanceFromPoint(coord) <= walkingDistance)
          .length > 0
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
      walkingDistance
    );

    if (merged === null) {
      continue;
    }

    if (
      merged[0].distanceFromPoint(src) <= walkingDistance &&
      merged[merged.length - 1].distanceFromPoint(dest) <= walkingDistance
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
        walkingDistance
      );

      if (merged === null) {
        continue;
      }

      if (
        merged[0].distanceFromPoint(src) <= walkingDistance &&
        merged[merged.length - 1].distanceFromPoint(dest) <= walkingDistance
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
    if (priority === 'FARE') {
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
      for (const routeA of a) {
        totalCostA += routeA.totalDistance();
      }

      for (const routeB of b) {
        totalCostB += routeB.totalDistance();
      }
    } else if (priority === 'TRANSFERS') {
      totalCostA += a.length;
      totalCostB += b.length;
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
