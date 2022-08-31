import fastify from 'fastify';
import {FastifyRequest, FastifyReply} from 'fastify';
import Point from './classes/point';
import routeOptimizer from './routeOptimizer';
import cors from '@fastify/cors';
import {readFileSync} from 'fs';

const server = fastify();

console.time('File import');
const floydWarshallModel: FloydWarshallExport = JSON.parse(
  readFileSync('floyd-warshall-davao.json', 'utf-8')
);
console.timeEnd('File import');

server.register(cors);

type FindRequest = FastifyRequest<{
  Querystring: {src: string; dest: string};
}>;

server.get('/find', async (request: FindRequest, reply: FastifyReply) => {
  const tmpSrc = request.query.src.split(',').map(i => parseFloat(i.trim()));
  const tmpDest = request.query.dest.split(',').map(i => parseFloat(i.trim()));

  const src = new Point(tmpSrc as Coordinate);
  const dest = new Point(tmpDest as Coordinate);

  console.time('Optimization time');
  const output = await routeOptimizer(src, dest, floydWarshallModel);
  console.timeEnd('Optimization time');

  reply.code(200).header('Content-Type', 'application/json').send(output);
});

server.listen({port: 8080}, (err, address) => {
  if (err) {
    console.error(err);
  }
  console.log(`Server listening at ${address}`);
});
