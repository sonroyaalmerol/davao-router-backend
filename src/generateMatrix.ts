import {readFileSync, promises} from 'fs';
import Graph from './classes/graph';
import Route from './classes/route';
import {floydWarshallMatrixGenerate} from './floydWarshall';

(async () => {
  console.time('Generation');
  const geojson: GeoJSONCollection = JSON.parse(
    readFileSync('./davao.geojson', 'utf-8')
  );
  const g = new Graph();

  geojson.features.forEach(route => {
    const r = new Route('', []);
    r.parseFromGeoJSON(route);
    g.addNode(r);
  });

  for (const route1 of g.nodes) {
    for (const route2 of g.nodes) {
      if (route1.equals(route2)) continue;

      if (route1.isWalkableTo(route2)) {
        g.addEdge(route1, route2, 1);
      }
    }
  }

  const generated = floydWarshallMatrixGenerate(g);

  await promises.writeFile(
    'floyd-warshall-davao.json',
    JSON.stringify({g, ...generated})
  );
  console.timeEnd('Generation');
})();
