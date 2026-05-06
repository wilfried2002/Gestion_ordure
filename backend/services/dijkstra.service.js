'use strict';

/**
 * dijkstra.service.js
 * Algorithmes d'optimisation de trajets pour la collecte des déchets.
 *
 * Exports : buildGraph · dijkstra · findNearestNode · optimizeMultiStop
 * Aucune dépendance externe — MinHeap maison.
 */

// ── Haversine ─────────────────────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a    = Math.sin(dLat / 2) ** 2
             + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
             * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── MinHeap (priority queue O(log n)) ────────────────────────────────────────
class MinHeap {
  constructor() { this._d = []; }
  get size()    { return this._d.length; }

  push(priority, value) {
    this._d.push({ priority, value });
    this._up(this._d.length - 1);
  }

  pop() {
    if (!this._d.length) return null;
    const top  = this._d[0];
    const last = this._d.pop();
    if (this._d.length) { this._d[0] = last; this._down(0); }
    return top;
  }

  _up(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this._d[p].priority <= this._d[i].priority) break;
      [this._d[p], this._d[i]] = [this._d[i], this._d[p]];
      i = p;
    }
  }

  _down(i) {
    const n = this._d.length;
    for (;;) {
      let s = i;
      const l = 2 * i + 1, r = l + 1;
      if (l < n && this._d[l].priority < this._d[s].priority) s = l;
      if (r < n && this._d[r].priority < this._d[s].priority) s = r;
      if (s === i) break;
      [this._d[s], this._d[i]] = [this._d[i], this._d[s]];
      i = s;
    }
  }
}

// ── buildGraph ────────────────────────────────────────────────────────────────
/**
 * Graphe K-voisins sur un ensemble de nœuds GPS.
 * Utilisé pour Dijkstra point-à-point (prochainBac).
 * @param {{ id, latitude, longitude }[]} nodes
 * @param {number} [K=6]
 */
function buildGraph(nodes, K = 6) {
  const graph = {};
  for (const n of nodes) graph[n.id] = [];

  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    const dists = [];
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      dists.push({
        neighborId: nodes[j].id,
        weight: haversine(a.latitude, a.longitude, nodes[j].latitude, nodes[j].longitude),
      });
    }
    dists.sort((x, y) => x.weight - y.weight);
    for (const e of dists.slice(0, K)) {
      if (!graph[a.id].some(x => x.neighborId === e.neighborId))
        graph[a.id].push(e);
      if (!graph[e.neighborId].some(x => x.neighborId === a.id))
        graph[e.neighborId].push({ neighborId: a.id, weight: e.weight });
    }
  }
  return graph;
}

// ── dijkstra ──────────────────────────────────────────────────────────────────
/**
 * Dijkstra avec MinHeap — O((V + E) log V).
 * @returns {{ path: string[], totalDistance: number }}
 */
function dijkstra(graph, startId, endId) {
  if (startId === endId) return { path: [startId], totalDistance: 0 };

  const dist = new Map(), prev = new Map(), vis = new Set();
  const heap = new MinHeap();

  for (const id of Object.keys(graph)) { dist.set(id, Infinity); prev.set(id, null); }
  dist.set(startId, 0);
  heap.push(0, startId);

  while (heap.size) {
    const { priority: d, value: cur } = heap.pop();
    if (vis.has(cur)) continue;
    vis.add(cur);
    if (cur === endId) break;

    for (const { neighborId, weight } of graph[cur] ?? []) {
      if (vis.has(neighborId)) continue;
      const nd = d + weight;
      if (nd < dist.get(neighborId)) {
        dist.set(neighborId, nd);
        prev.set(neighborId, cur);
        heap.push(nd, neighborId);
      }
    }
  }

  if (dist.get(endId) === Infinity) return { path: [], totalDistance: Infinity };

  const path = [];
  for (let c = endId; c !== null; c = prev.get(c)) path.unshift(c);
  return { path, totalDistance: Math.round(dist.get(endId) * 1000) / 1000 };
}

// ── findNearestNode ───────────────────────────────────────────────────────────
function findNearestNode(nodes, lat, lng) {
  if (!nodes.length) return null;
  let best = nodes[0];
  let bestD = haversine(lat, lng, best.latitude, best.longitude);
  for (let i = 1; i < nodes.length; i++) {
    const d = haversine(lat, lng, nodes[i].latitude, nodes[i].longitude);
    if (d < bestD) { bestD = d; best = nodes[i]; }
  }
  return best;
}

// ── 2-opt improvement ─────────────────────────────────────────────────────────
/**
 * Amélioration locale 2-opt sur un tableau de bacs ordonnés.
 * Réduit la distance totale en inversant des sous-séquences sous-optimales.
 * O(n²) par passage, converge en quelques itérations sur des instances <200 bacs.
 * Ne retourne PAS au dépôt (trajet linéaire, pas circulaire).
 */
function twoOpt(route) {
  if (route.length < 4) return route;
  let improved = true;

  while (improved) {
    improved = false;
    for (let i = 0; i < route.length - 1; i++) {
      for (let j = i + 2; j < route.length - 1; j++) {
        // Arêtes actuelles : (i → i+1) et (j → j+1)
        const d1 = haversine(route[i].latitude,     route[i].longitude,
                             route[i + 1].latitude, route[i + 1].longitude)
                 + haversine(route[j].latitude,     route[j].longitude,
                             route[j + 1].latitude, route[j + 1].longitude);
        // Arêtes inversées : (i → j) et (i+1 → j+1)
        const d2 = haversine(route[i].latitude,     route[i].longitude,
                             route[j].latitude,     route[j].longitude)
                 + haversine(route[i + 1].latitude, route[i + 1].longitude,
                             route[j + 1].latitude, route[j + 1].longitude);

        if (d2 < d1 - 1e-10) {
          // Inverser le segment [i+1 … j]
          const seg = route.slice(i + 1, j + 1).reverse();
          route = [...route.slice(0, i + 1), ...seg, ...route.slice(j + 1)];
          improved = true;
        }
      }
    }
  }
  return route;
}

// ── optimizeMultiStop ─────────────────────────────────────────────────────────
const VITESSE_MOY_KMH = 30;

/**
 * Optimise un trajet multi-arrêts depuis startPoint.
 *
 * Phase 1 — Nearest-neighbor greedy pondéré selon le critère.
 * Phase 2 — Amélioration 2-opt (pour 'distance' et 'temps').
 * Segments — Lignes droites GPS entre bacs consécutifs.
 *   → Pas de Dijkstra pour les segments : nos nœuds sont des bacs,
 *     pas des intersections. Utiliser des bacs comme relais intermédiaires
 *     produit des trajets hors zone (bug visuel). La ligne droite est exacte
 *     en l'absence de réseau routier.
 *
 * @param {{ lat, lng }}                       startPoint
 * @param {any[]}                              bacs
 * @param {'distance'|'temps'|'priorite'}      [criterium='distance']
 * @returns {{ orderedBacs, totalDistance, estimatedTime, segments }}
 */
function optimizeMultiStop(startPoint, bacs, criterium = 'distance') {
  if (!bacs.length) {
    return { orderedBacs: [], totalDistance: 0, estimatedTime: 0, segments: [] };
  }

  // Coût pondéré selon le critère
  function cost(lat, lng, bac) {
    const d = haversine(lat, lng, bac.latitude, bac.longitude);
    if (criterium === 'temps')    return d / VITESSE_MOY_KMH * 60;
    if (criterium === 'priorite') return d * (1 - (bac.niveauRemplissage ?? 0) / 100);
    return d;
  }

  // ── Phase 1 : nearest-neighbor ────────────────────────────────────────────
  const pool = [...bacs];
  let ordered = [];
  let lat = startPoint.lat, lng = startPoint.lng;

  while (pool.length) {
    let bi = 0, bc = cost(lat, lng, pool[0]);
    for (let i = 1; i < pool.length; i++) {
      const c = cost(lat, lng, pool[i]);
      if (c < bc) { bc = c; bi = i; }
    }
    const next = pool.splice(bi, 1)[0];
    ordered.push(next);
    lat = next.latitude;
    lng = next.longitude;
  }

  // ── Phase 2 : 2-opt (distance & temps — pas priorité car pondération non-linéaire) ──
  if (criterium !== 'priorite' && ordered.length >= 4) {
    ordered = twoOpt(ordered);
  }

  // ── Segments directs startPoint → bac[0] → … → bac[n-1] ─────────────────
  // La ligne s'arrête EXACTEMENT au dernier bac, sans dépasser la zone.
  const stops = [
    { _id: '__start__', latitude: startPoint.lat, longitude: startPoint.lng },
    ...ordered,
  ];
  const segments = [];
  let total = 0;

  for (let i = 0; i < stops.length - 1; i++) {
    const fr = stops[i], to = stops[i + 1];
    const d  = haversine(fr.latitude, fr.longitude, to.latitude, to.longitude);
    total   += d;
    segments.push({
      de:         { bacId: fr._id === '__start__' ? null : fr._id.toString(), lat: fr.latitude,  lng: fr.longitude  },
      vers:       { bacId: to._id.toString(),                                  lat: to.latitude,   lng: to.longitude   },
      chemin:     [{ lat: fr.latitude, lng: fr.longitude }, { lat: to.latitude, lng: to.longitude }],
      distanceKm: Math.round(d * 100) / 100,
      tempsMin:   Math.round((d / VITESSE_MOY_KMH) * 60),
    });
  }

  return {
    orderedBacs:   ordered,
    totalDistance: Math.round(total * 10) / 10,
    estimatedTime: Math.round((total / VITESSE_MOY_KMH) * 60),
    segments,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
module.exports = { buildGraph, dijkstra, findNearestNode, optimizeMultiStop };
