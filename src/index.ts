import fastify from 'fastify';
import {FastifyRequest, FastifyReply} from 'fastify';
import Point from './classes/point';
import routeOptimizer from './routeOptimizer';
import cors from '@fastify/cors';
import {readFileSync} from 'fs';
import constants from './constants';

const server = fastify();

console.time('File import');
const distanceModel: FloydWarshallExport = JSON.parse(
  readFileSync('floyd-warshall-davao-distance.json', 'utf-8')
);
const transferModel: FloydWarshallExport = JSON.parse(
  readFileSync('floyd-warshall-davao-transfer.json', 'utf-8')
);
console.timeEnd('File import');

server.register(cors);

type FindRequest = FastifyRequest<{
  Querystring: {src: string; dest: string; priority?: string};
}>;

server.get('/find', async (request: FindRequest, reply: FastifyReply) => {
  const tmpSrc = request.query.src.split(',').map(i => parseFloat(i.trim()));
  const tmpDest = request.query.dest.split(',').map(i => parseFloat(i.trim()));
  const priority: PriorityChoice = (request.query.priority
    ?.trim()
    .toUpperCase() ?? 'TRANSFERS') as PriorityChoice;

  const src = new Point(tmpSrc as Coordinate);
  const dest = new Point(tmpDest as Coordinate);

  console.time('Optimization time');

  let floydWarshallModel = transferModel;
  if (priority === 'DISTANCE') {
    floydWarshallModel = distanceModel;
  }

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

  console.timeEnd('Optimization time');

  reply.code(200).header('Content-Type', 'application/json').send(results);
});

server.listen({port: 8080}, (err, address) => {
  if (err) {
    console.error(err);
  }
  console.log(`Server listening at ${address}`);
});
