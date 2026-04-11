/**
 * Validaciones de entrada de aristas y del grafo antes de ejecutar Dijkstra.
 */

import { parseInput } from './parseInput.js'

/**
 * Arista canónica para comparar duplicados en grafo no dirigido.
 * @param {string} a
 * @param {string} b
 * @returns {[string, string]}
 */
function canonicalEdge(a, b) {
  return a < b ? [a, b] : [b, a]
}

/**
 * @param {string} input
 * @param {Array<{ from: string, to: string }>} existingEdges
 * @returns {{ ok: true, parsed: { from: string, to: string, weight: number } } | { ok: false, message: string, isDuplicate?: boolean }}
 */
export function validateEdgeInput(input, existingEdges) {
  let parsed
  try {
    parsed = parseInput(input)
  } catch (e) {
    return { ok: false, message: e.message }
  }

  const [cFrom, cTo] = canonicalEdge(parsed.from, parsed.to)
  const duplicate = existingEdges.some((e) => {
    const [ef, et] = canonicalEdge(e.from, e.to)
    return ef === cFrom && et === cTo
  })

  if (duplicate) {
    return {
      ok: false,
      message:
        'Esta conexión ya existe en el grafo. No se añadirá de nuevo.',
      isDuplicate: true,
    }
  }

  return { ok: true, parsed }
}

/**
 * @param {{ nodes: Array<{ id: string }>, edges: unknown[] }} graph
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateGraphForDijkstra(graph) {
  if (!graph.nodes || graph.nodes.length < 2) {
    return {
      ok: false,
      message: 'Se necesitan al menos dos nodos para calcular una ruta.',
    }
  }
  if (!graph.edges || graph.edges.length < 1) {
    return {
      ok: false,
      message: 'Se necesita al menos una arista para calcular una ruta.',
    }
  }
  return { ok: true }
}

/**
 * Verifica si existe conexión entre dos nodos usando BFS
 * @param {{ nodes: Array<{ id: string }>, edges: Array<{ from: string, to: string }> }} graph
 * @param {string} startNode
 * @param {string} endNode
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateGraphConnectivity(graph, startNode, endNode) {
  // Build adjacency list
  const adjacency = {}
  graph.nodes.forEach(node => {
    adjacency[node.id] = []
  })
  
  graph.edges.forEach(edge => {
    adjacency[edge.from].push(edge.to)
    adjacency[edge.to].push(edge.from) // Undirected graph
  })
  
  // BFS to check connectivity
  const visited = new Set()
  const queue = [startNode]
  visited.add(startNode)
  
  while (queue.length > 0) {
    const current = queue.shift()
    if (current === endNode) {
      return { ok: true }
    }
    
    for (const neighbor of adjacency[current]) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push(neighbor)
      }
    }
  }
  
  return {
    ok: false,
    message: `No existe conexión entre el nodo origen "${startNode}" y el nodo destino "${endNode}". Verifica que las aristas conecten ambos nodos.`
  }
}

/**
 * Comprueba inicio, fin y pertenencia al grafo antes de llamar al algoritmo.
 * @param {{ nodes: Array<{ id: string }> }} graph
 * @param {string} startNode
 * @param {string} endNode
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateDijkstraRun(graph, startNode, endNode) {
  if (!startNode) {
    return { ok: false, message: 'Selecciona un nodo de inicio.' }
  }
  if (!endNode) {
    return { ok: false, message: 'Selecciona un nodo de destino.' }
  }
  if (startNode === endNode) {
    return {
      ok: false,
      message: 'El nodo de inicio y el de destino deben ser distintos.',
    }
  }

  const ids = new Set(graph.nodes.map((n) => n.id))
  if (!ids.has(startNode)) {
    return {
      ok: false,
      message: `El nodo de inicio "${startNode}" no existe en el grafo actual.`,
    }
  }
  if (!ids.has(endNode)) {
    return {
      ok: false,
      message: `El nodo de destino "${endNode}" no existe en el grafo actual.`,
    }
  }

  const graphOk = validateGraphForDijkstra(graph)
  if (!graphOk.ok) return graphOk

  const connectivityOk = validateGraphConnectivity(graph, startNode, endNode)
  if (!connectivityOk.ok) return connectivityOk

  return { ok: true }
}
