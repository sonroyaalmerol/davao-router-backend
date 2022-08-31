import Route from './route';

export default class Graph {
  nodes: Route[];
  edges: Edge[];
  nodeMap: {
    [key: string]: number;
  };

  constructor(
    nodes?: Route[],
    edges?: Edge[],
    nodeMap?: {
      [key: string]: number;
    }
  ) {
    this.nodes = nodes ?? [];
    this.edges = edges ?? [];
    this.nodeMap = nodeMap ?? {};
  }

  addNode(route: Route) {
    this.nodes.push(route);
    this.nodeMap[route.name] = Object.keys(this.nodeMap).length;
  }
  /*
  removeNode(route: Route) {
    this.nodes.filter(node => node.equals(route));
  }
  */

  addEdge(routeA: Route, routeB: Route, weight: number) {
    this.edges.push({u: routeA, v: routeB, weight});
    this.edges.push({v: routeA, u: routeB, weight});
  }
  /*
  removeEdge(routeA: Route, routeB: Route) {
    this.edges.filter(edge => edge.u.equals(routeA) && edge.v.equals(routeB));
  }
  */

  findNeighbors(route: Route): Route[] {
    let neighbors: Route[] = [];

    for (const edge of this.edges) {
      if (edge.u.equals(route)) {
        neighbors = neighbors.filter(n => n.name !== edge.v.name);
        neighbors.push(edge.v);
      } else if (edge.v.equals(route)) {
        neighbors = neighbors.filter(n => n.name !== edge.u.name);
        neighbors.push(edge.u);
      }
    }

    return neighbors;
  }
}
