'use strict';

angular
  .module('app')
  .service('dos', dos);

dos.$inject = ['$rootScope'];

function dos() {

  this.kDisjoint = function (nodes, links, s, t, k, nodeId) {
    console.log("nodes recieved:", nodes);
    var graph = {};
    links.forEach(function(link) {
      var sid = nodeId(link.source),
          tid = nodeId(link.target);
      if (!graph.hasOwnProperty(sid)) graph[sid] = {};
      graph[sid][tid] = link.Weight != null ? +link.Weight : 1;
      if (!graph.hasOwnProperty(tid)) graph[tid] = {};
      graph[tid][sid] = link.Weight != null ? +link.Weight : 1;
    });
    console.log("Graph in kdj:", graph);
    var paths = [];
    while (paths.length < k) {
      var path = shortestPath(graph, nodeId(s), nodeId(t), nodeId);
      if (!path.length) break;
      paths.push(path);
      if (path.length === 1) break;
      for (var i = 0; i < path.length - 1; i++) {
        delete graph[path[i]];
        for (var k in graph) {
          delete graph[k][path[i]];
        }
      }
    }
    return paths;
  }

  function shortestPath(graph, s, t, nodeId) {
    console.log("Shortest path:", graph);
    var dist = {},
        parent = {},
        adj = graph;
    for (var sid in graph) {
      dist[sid] = Infinity;
      parent[sid] = null;
    }
    var pq = minHeap(function(a, b) {
      return dist[a] - dist[b];
    });
    console.log("Pq:", pq);
    var v = s;
    dist[s] = 0;
    while (v != null) {
      if (dist[v] == Infinity || v == t) break;
      if (adj.hasOwnProperty(v)) {
        console.log("adj:", adj);
        for (var u in adj[v]) {
          var d = adj[v][u],
              uid = nodeId(u);
          if (dist[v] + d < dist[u]) {
            dist[u] = dist[v] + d;
            console.log("pushing:", u);
            pq.push(u);
            parent[u] = v;
          }
        }
      }
      v = pq.pop();
    }
    var u = t,
        path = [];
    while (parent[u]) {
      path.unshift(u);
      u = parent[u];
    }
    return path;
  }

  // From Mike Bostock's http://bost.ocks.org/mike/simplify/
  function minHeap(compare) {
    var heap = {},
        array = [];

    heap.push = function() {
      console.log("arguments:", arguments);
      for (var i = 0, n = arguments.length; i < n; ++i) {
        var object = arguments[i];
        var index = array.push(object) - 1
        up(index);
      }
      return array.length;
    };

    heap.pop = function() {
      var removed = array[0],
          object = array.pop();
      if (array.length) {
        var index = 0
        array[index] = object;
        down(0);
      }
      return removed;
    };

    heap.remove = function(removed) {
      var i = removed.index,
          object = array.pop();
      if (i !== array.length) {
        array[object.index = i] = object;
        (compare(object, removed) < 0 ? up : down)(i);
      }
      return i;
    };

    function up(i) {
      var object = array[i];
      while (i > 0) {
        var up = ((i + 1) >> 1) - 1,
            parent = array[up];
        if (compare(object, parent) >= 0) break;
        array[i] = parent;
        array[i = up] = object;
      }
    }

    function down(i) {
      var object = array[i];
      while (true) {
        var right = (i + 1) << 1,
            left = right - 1,
            down = i,
            child = array[down];
        if (left < array.length && compare(array[left], child) < 0) child = array[down = left];
        if (right < array.length && compare(array[right], child) < 0) child = array[down = right];
        if (down === i) break;
        array[i] = child;
        array[down] = object;
      }
    }

    return heap;
  }

  function descending(a, b) {
    return b < a ? -1 : b > a ? 1 : b >= a ? 0 : b >= b || b <= b ? -1 : a >= a || a <= a ? 1 : NaN;
  }
}