import Route from './route';

export default class Graph {
  nodes: Route[];
  edges: Edge[];
  nodeMap: {
    [key: string]: number;
  };

  constructor() {
    this.nodes = [];
    this.edges = [];
    this.nodeMap = {};
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
}
