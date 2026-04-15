/**
 * Dijkstra — cada iteración genera DOS pasos:
 *   phase:'evaluate' → nodo u activo, aristas candidatas en amarillo,
 *                      ya muestra quién será el próximo seleccionado
 *   phase:'select'   → nodo v (el de menor dist) confirmado, arista u→v en rojo
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

function snapshotDistancesAndPrev(nodeIds, dist, prev) {
  const distances = {}
  const previousNodes = {}
  for (const id of nodeIds) {
    distances[id] = dist[id]
    previousNodes[id] = prev[id]
  }
  return { distances, previousNodes }
}

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
    // Elegir nodo u con distancia mínima
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

    // Marcar u como visitado y relajar aristas
    visited.add(u)
    const edgesEvaluated = []
    const edgesUpdated = []
    const updatedNodes = []

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

    const snap = snapshotDistancesAndPrev(nodeIds, dist, prev)

    // Calcular quién será el próximo nodo seleccionado
    let nextNode = null
    let nextBest = Infinity
    for (const id of nodeIds) {
      if (!visited.has(id) && dist[id] < nextBest) {
        nextBest = dist[id]
        nextNode = id
      }
    }

    // ── FASE A: evaluate ────────────────────────────────────
    // Nodo u activo, aristas candidatas en amarillo.
    // Muestra las distancias calculadas y quién será el próximo.
    let descEval
    if (edgesEvaluated.length > 0) {
      const lines = edgesEvaluated.map(({ from, to }) => {
        const w = adj[from].find(x => x.to === to)?.weight ?? '?'
        const newD = best + w
        const updated = edgesUpdated.some(e => e.to === to)
        return `  ${from}→${to}: ${best} + ${w} = ${newD}${!updated ? `  (ya tenía ${snap.distances[to]})` : ''}`
      }).join('\n')
      descEval = `Nodo actual: ${u}  (dist. ${best})\nEvaluando vecinos:\n${lines}`
    } else {
      descEval = `Nodo actual: ${u}  (dist. ${best})\nSin vecinos no visitados.`
    }

    steps.push({
      phase: 'evaluate',
      stepNumber: steps.length + 1,
      currentNode: u,
      nextNode,
      visited: Array.from(visited),
      distances: snap.distances,
      previousNodes: snap.previousNodes,
      edgesEvaluated,
      edgesUpdated,
      updatedNodes,
      predecessorEdge: null,
      description: descEval,
    })

    // ── FASE B: select ──────────────────────────────────────
    // Confirma el próximo nodo (nextNode) y marca su arista predecesora en rojo.
    if (nextNode !== null) {
      const nextPred = snap.previousNodes[nextNode]
      const otherCandidates = nodeIds
        .filter(id => !visited.has(id) && Number.isFinite(dist[id]) && id !== nextNode)
        .sort((a, b) => dist[a] - dist[b])

      const otherStr = otherCandidates.length > 0
        ? `\nOtros candidatos: ${otherCandidates.map(id => `${id}(${dist[id]})`).join(', ')}`
        : ''

      const descSelect = nextPred != null
        ? `✓ Seleccionado: ${nextNode}  (dist. mínima: ${nextBest})\nVía: ${nextPred}→${nextNode} — camino más corto conocido.${otherStr}`
        : `✓ Seleccionado: ${nextNode}  (dist. ${nextBest})`

      steps.push({
        phase: 'select',
        stepNumber: steps.length + 1,
        currentNode: nextNode,
        nextNode: null,
        visited: Array.from(visited),
        distances: snap.distances,
        previousNodes: snap.previousNodes,
        edgesEvaluated,   // mantener amarillas de contexto
        edgesUpdated,
        updatedNodes,
        predecessorEdge: nextPred != null ? { from: nextPred, to: nextNode } : null,
        description: descSelect,
      })
    }
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

  return { steps, finalPath, allPaths, selectedNodes, totalDistance: Number.isFinite(totalDistance) ? totalDistance : Infinity }
}
