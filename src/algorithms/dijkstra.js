/**
 * Implementación pura del algoritmo de Dijkstra para grafos no dirigidos.
 * No depende de React ni de ningún estado global: solo recibe datos y devuelve resultado.
 */

/**
 * Construye lista de adyacencia (aristas en ambas direcciones).
 * @param {Array<{ from: string, to: string, weight: number }>} edges
 * @param {string[]} nodeIds
 * @returns {Record<string, Array<{ to: string, weight: number }>>}
 */
function buildAdjacency(edges, nodeIds) {
  const adj = {}
  for (const id of nodeIds) adj[id] = []
  for (const e of edges) {
    adj[e.from].push({ to: e.to, weight: e.weight })
    adj[e.to].push({ to: e.from, weight: e.weight })
  }
  return adj
}

/**
 * Copia de distancias y predecesores para un paso de la simulación.
 */
function snapshotDistancesAndPrev(nodeIds, dist, prev) {
  const distances = {}
  const previousNodes = {}
  for (const id of nodeIds) {
    distances[id] = dist[id]
    previousNodes[id] = prev[id]
  }
  return { distances, previousNodes }
}

/**
 * Reconstruye el camino más corto desde `end` usando el mapa de predecesores.
 */
function reconstructPath(prev, start, end) {
  const path = []
  let cur = end
  while (cur != null) {
    path.unshift(cur)
    if (cur === start) break
    cur = prev[cur]
  }
  if (path.length === 0 || path[0] !== start) return []
  return path
}

/**
 * Ejecuta Dijkstra y devuelve pasos para animación, camino final y distancia total.
 * @param {{ nodes: Array<{ id: string }>, edges: Array<{ from: string, to: string, weight: number }> }} graph
 * @param {string} start
 * @param {string} end
 * @returns {{ steps: object[], finalPath: string[], totalDistance: number }}
 */
export function runDijkstra(graph, start, end) {
  const nodeIds = graph.nodes.map((n) => n.id)
  const adj = buildAdjacency(graph.edges, nodeIds)

  const dist = {}
  const prev = {}
  for (const id of nodeIds) {
    dist[id] = Infinity
    prev[id] = null
  }
  dist[start] = 0

  const visited = new Set()
  const steps = []
  const selectedNodes = []

  while (visited.size < nodeIds.length) {
    let u = null
    let best = Infinity
    for (const id of nodeIds) {
      if (!visited.has(id) && dist[id] < best) {
        best = dist[id]
        u = id
      }
    }
    if (u === null || !Number.isFinite(best)) break

    selectedNodes.push({ node: u, distance: best, step: selectedNodes.length + 1 })

    visited.add(u)
    const updatedNodes = []
    const edgesEvaluated = []
    const edgesUpdated = []

    for (const { to: v, weight } of adj[u] || []) {
      if (visited.has(v)) continue
      edgesEvaluated.push({ from: u, to: v })
      const alt = dist[u] + weight
      if (alt < dist[v]) {
        dist[v] = alt
        prev[v] = u
        updatedNodes.push(v)
        edgesUpdated.push({ from: u, to: v })
      }
    }

    // Descripción legible del paso para la UI
    const { distances, previousNodes } = snapshotDistancesAndPrev(nodeIds, dist, prev)

    let description = `Nodo actual: ${u}  (dist. ${best})\n`
    if (edgesEvaluated.length > 0) {
      const evalStr = edgesEvaluated.map(({ to }) => {
        const prev_d = dist[to] === Infinity ? '∞' : dist[to]
        const changed = edgesUpdated.some((e) => e.to === to)
        return changed ? `${u}→${to} mejoró a ${dist[to]}` : `${u}→${to} sin mejora (${prev_d})`
      }).join(', ')
      description += `Aristas: ${evalStr}`
    } else {
      description += `Sin vecinos no visitados.`
    }

    steps.push({
      stepNumber: steps.length + 1,
      currentNode: u,
      visited: Array.from(visited),
      distances,
      updatedNodes,
      edgesEvaluated,
      edgesUpdated,
      previousNodes,
      description,
    })
  }

  const allPaths = {}
  for (const nodeId of nodeIds) {
    if (Number.isFinite(dist[nodeId]) && nodeId !== start) {
      allPaths[nodeId] = { path: reconstructPath(prev, start, nodeId), distance: dist[nodeId] }
    }
  }
  allPaths[start] = { path: [start], distance: 0 }

  const totalDistance = dist[end]
  const finalPath = Number.isFinite(totalDistance) ? reconstructPath(prev, start, end) : []

  return {
    steps,
    finalPath,
    allPaths,
    selectedNodes,
    totalDistance: Number.isFinite(totalDistance) ? totalDistance : Infinity,
  }
}
