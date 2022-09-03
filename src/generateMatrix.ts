import {readFileSync, promises} from 'fs';
import Graph from './classes/graph';
import Route from './classes/route';
import constants from './constants';
import {floydWarshallMatrixGenerate} from './floydWarshall';

(async () => {
  console.time('Generation');
  const geojson: GeoJSONCollection = JSON.parse(
    readFileSync('./davao.geojson', 'utf-8')
  );
  const gDistance = new Graph();
  const gTransfers = new Graph();

  geojson.features.forEach(route => {
    const r = new Route('', []);
    r.parseFromGeoJSON(route);
    gDistance.addNode(r);
    gTransfers.addNode(r);
  });

  for (const route1 of gDistance.nodes) {
    for (const route2 of gDistance.nodes) {
      if (route1.equals(route2)) continue;
      const edge =
        route1.getDistanceNearestWalkable(route2) +
        route2.getDistanceNearestWalkable(route1);
      if (edge !== -1) {
        gDistance.addEdge(route1, route2, edge);
        gTransfers.addEdge(
          route1,
          route2,
          constants.BASE_FARE + constants.FARE_PER_KILOMETER * edge
        );
      }
    }
  }

  const generatedDistanceMatrix = floydWarshallMatrixGenerate(gDistance);
  const generatedTransferMatrix = floydWarshallMatrixGenerate(gTransfers);

  await Promise.all([
    promises.writeFile(
      'floyd-warshall-davao-distance.json',
      JSON.stringify({g: gDistance, ...generatedDistanceMatrix})
    ),
    promises.writeFile(
      'floyd-warshall-davao-transfer.json',
      JSON.stringify({g: gTransfers, ...generatedTransferMatrix})
    ),
  ]);
  console.timeEnd('Generation');
})();
