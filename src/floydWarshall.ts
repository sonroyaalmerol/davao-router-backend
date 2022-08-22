import Graph from './classes/graph';
import Point from './classes/point';
import Route from './classes/route';

const floydWarshallMatrixGenerate = (g: Graph) => {
  const matrix: number[][] = [];
  for (let i = 0; i < g.nodes.length; i++) {
    const row = [];
    for (let j = 0; j < g.nodes.length; j++) {
      row.push(Infinity);
    }
    matrix.push(row);
  }

  const next: (Route | null)[][] = [];
  for (let i = 0; i < g.nodes.length; i++) {
    const row = [];
    for (let j = 0; j < g.nodes.length; j++) {
      row.push(null);
    }
    next.push(row);
  }

  g.edges.forEach(edge => {
    matrix[g.nodeMap[edge.u.name]][g.nodeMap[edge.v.name]] = edge.weight;
    next[g.nodeMap[edge.u.name]][g.nodeMap[edge.v.name]] = edge.v;
  });

  g.nodes.forEach(node => {
    matrix[g.nodeMap[node.name]][g.nodeMap[node.name]] = 0;
    next[g.nodeMap[node.name]][g.nodeMap[node.name]] = node;
  });

  g.nodes.forEach(k => {
    g.nodes.forEach(i => {
      g.nodes.forEach(j => {
        if (
          matrix[g.nodeMap[i.name]][g.nodeMap[j.name]] >
          matrix[g.nodeMap[i.name]][g.nodeMap[k.name]] +
            matrix[g.nodeMap[k.name]][g.nodeMap[j.name]]
        ) {
          matrix[g.nodeMap[i.name]][g.nodeMap[j.name]] =
            matrix[g.nodeMap[i.name]][g.nodeMap[k.name]] +
            matrix[g.nodeMap[k.name]][g.nodeMap[j.name]];
          next[g.nodeMap[i.name]][g.nodeMap[j.name]] =
            next[g.nodeMap[i.name]][g.nodeMap[k.name]];
        }
      });
    });
  });

  return {matrix, next};
};

type FloydWarshallReconstruction = {
  next: (Route | null)[][];
  g: Graph;
};

const floydWarshallPathReconstruction = (
  u: Route,
  v: Route,
  opts: FloydWarshallReconstruction
) => {
  const path: Route[] = [];
  const {next, g} = opts;
  if (next[g.nodeMap[u.name]][g.nodeMap[v.name]] === null) {
    return [];
  }
  path.push(
    new Route(
      u.name,
      u.coordinates.map(i => new Point(i.coordinate))
    )
  );
  while (u.name !== v.name) {
    const tmpU = next[g.nodeMap[u.name]][g.nodeMap[v.name]];
    if (tmpU !== null) {
      u = tmpU;
      path.push(
        new Route(
          u.name,
          u.coordinates.map(i => new Point(i.coordinate))
        )
      );
    }
  }

  return path;
};

export {floydWarshallMatrixGenerate, floydWarshallPathReconstruction};
