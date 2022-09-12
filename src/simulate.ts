import {readFileSync, writeFileSync} from 'fs';
import Point from './classes/point';
import constants from './constants';
import routeOptimizer from './routeOptimizer';
import * as Papa from 'papaparse';
import {performance} from 'perf_hooks';

const transferModel: FloydWarshallExport = JSON.parse(
  readFileSync('floyd-warshall-davao-transfer.json', 'utf-8')
);

const westList = [
  {
    name: 'Rosalina Village III',
    long: 125.50580611319515,
    lat: 7.041278050000001,
  },
  {
    name: 'Green Meadows',
    long: 125.51123021372862,
    lat: 7.0797439,
  },
  {
    name: 'Gulf View Executive Homes',
    long: 125.5384697722645,
    lat: 7.0436537999999995,
  },
  {
    name: 'Savemore Bangkal',
    long: 125.55893831297556,
    lat: 7.060514850000001,
  },
  {
    name: 'GSIS Heights',
    long: 125.57456445852526,
    lat: 7.0604039499999995,
  },
  {
    name: 'NHA Maa',
    long: 125.57931010280107,
    lat: 7.0992405000000005,
  },
];

const eastList = [
  {
    name: 'SM Ecoland',
    long: 125.595719,
    lat: 7.0529355,
  },
  {
    name: 'Gaisano Mall of Davao',
    long: 125.61408648872225,
    lat: 7.077957700000001,
  },
  {
    name: 'Holy Cross of Davao College',
    long: 125.61643165177387,
    lat: 7.0775212,
  },
  {
    name: 'Ateneo de Davao University',
    long: 125.61341598597471,
    lat: 7.07181465,
  },
  {
    name: 'Azuela Cove',
    long: 125.6440283,
    lat: 7.1037959,
  },
  {
    name: 'Davao Medical School Foundation',
    long: 125.60679619059981,
    lat: 7.08546035,
  },
];

const simulate = async (tmpSrc: number[], tmpDest: number[]) => {
  const priority: PriorityChoice = 'TRANSFERS' as PriorityChoice;

  const src = new Point(tmpSrc as Coordinate);
  const dest = new Point(tmpDest as Coordinate);

  const bMs = performance.now();

  const floydWarshallModel = transferModel;

  let results: GeoJSONCollection[] = [];
  let sourceRadius = constants.MAXIMUM_WALKABLE_DISTANCE;
  let destinationRadius = constants.MAXIMUM_WALKABLE_DISTANCE;
  let srcDone = false;
  let destDone = false;
  while (results.length === 0) {
    if (destDone && srcDone) {
      break;
    }

    const {source, destination, output} = await routeOptimizer(
      src,
      dest,
      floydWarshallModel,
      {
        priority,
        srcWalkableDistance: sourceRadius,
        destWalkableDistance: destinationRadius,
      }
    );

    if (
      (source.length === 0 ||
        (source.length > 0 &&
          destination.length > 0 &&
          results.length === 0)) &&
      sourceRadius < constants.MAXIMUM_ALLOWABLE_DISTANCE
    ) {
      sourceRadius += 0.2;
    } else {
      srcDone = true;
    }

    if (
      (destination.length === 0 ||
        (source.length > 0 &&
          destination.length > 0 &&
          results.length === 0)) &&
      destinationRadius < constants.MAXIMUM_ALLOWABLE_DISTANCE
    ) {
      destinationRadius += 0.2;
    } else {
      destDone = true;
    }
    results = output;
  }

  const aMs = performance.now();

  return {
    time: aMs - bMs,
    numberOfRoutes: results.length,
  };
};

(async () => {
  const output: {
    source: string;
    destination: string;
    numberOfRoutes: number;
    time: number;
  }[] = [];
  for await (const wRoute of westList) {
    for await (const eRoute of eastList) {
      const wResults = await simulate(
        [wRoute.lat, wRoute.long],
        [eRoute.lat, eRoute.long]
      );

      const eResults = await simulate(
        [eRoute.lat, eRoute.long],
        [wRoute.lat, wRoute.long]
      );

      output.push({
        source: wRoute.name,
        destination: eRoute.name,
        numberOfRoutes: wResults.numberOfRoutes,
        time: wResults.time,
      });

      output.push({
        source: eRoute.name,
        destination: wRoute.name,
        numberOfRoutes: eResults.numberOfRoutes,
        time: eResults.time,
      });
    }
  }

  const csv = Papa.unparse(output);

  writeFileSync('simulation-results.csv', csv);
})();
