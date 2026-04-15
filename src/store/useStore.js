/**
 * Estado global (Zustand): grafo, resultado de Dijkstra y control de la simulación.
 * Aquí se invoca el algoritmo puro y se guardan los pasos; la UI solo dispara acciones.
 */

import { create } from 'zustand'
import { runDijkstra as runDijkstraAlgorithm } from '../algorithms/dijkstra.js'
import {
  validateDijkstraRun,
  validateGraphForDijkstra,
} from '../utils/validators.js'

/**
 * @param {string} a
 * @param {string} b
 * @returns {[string, string]}
 */
function canonicalEdge(a, b) {
  return a < b ? [a, b] : [b, a]
}

// Genera el resumen estructurado del algoritmo para mostrar en el chat
export function formatDijkstraSummary(result, startNode, endNode) {
  const { steps, allPaths, finalPath, totalDistance } = result

  const paths = Object.entries(allPaths)
    .filter(([id]) => id !== startNode)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([nodeId, { path, distance }]) => ({
      nodeId,
      path: path.join(' → '),
      distance: Number.isFinite(distance) ? distance : '∞',
    }))

  const unreachable = steps.length > 0
    ? steps[steps.length - 1].visited.filter((id) => !allPaths[id])
    : []

  return {
    type: 'result',
    startNode,
    endNode,
    finalPath: finalPath.join(' → '),
    totalDistance: Number.isFinite(totalDistance) ? totalDistance : '∞',
    hasPath: finalPath.length > 0,
    paths,
    unreachable,
  }
}

export const useStore = create((set, get) => ({
  graph: { nodes: [], edges: [] },
  /** Posiciones personalizadas: coordenadas normalizadas al tamaño del canvas (0–1). */
  nodeLayoutOverrides: {},
  steps: [],
  currentStep: -1,
  isPlaying: false,
  startNode: '',
  endNode: '',
  finalPath: [],
  allPaths: {},
  selectedNodes: [],
  selectedNodesMessage: '',
  totalDistance: 0,
  lastResult: null,
  /** Cómo dibujar aristas en el canvas: straight | curved | step */
  edgeRenderMode: 'straight',

  setEdgeRenderMode: (mode) => set({ edgeRenderMode: mode }),

  /**
   * Fija la posición de un nodo al arrastrarlo (rx, ry en fracción del ancho/alto del lienzo).
   */
  setNodeLayoutOverride: (id, rx, ry) =>
    set((s) => ({
      nodeLayoutOverrides: {
        ...s.nodeLayoutOverrides,
        [id]: {
          rx: Math.min(0.96, Math.max(0.04, rx)),
          ry: Math.min(0.96, Math.max(0.04, ry)),
        },
      },
    })),

  /**
   * Añade una arista no dirigida (una sola entrada en `edges`, orden canónico).
   */
  addEdge: (from, to, weight) => {
    const fromId = String(from).trim()
    const toId = String(to).trim()
    const [a, b] = canonicalEdge(fromId, toId)
    const { graph } = get()
    const exists = graph.edges.some((e) => {
      const [ea, eb] = canonicalEdge(e.from, e.to)
      return ea === a && eb === b
    })
    if (exists) return

    const newEdge = { from: a, to: b, weight: Number(weight) }
    const edges = [...graph.edges, newEdge]
    const idSet = new Set(graph.nodes.map((n) => n.id))
    idSet.add(fromId)
    idSet.add(toId)
    const nodes = [...idSet].sort().map((id) => ({ id }))
    set({ graph: { nodes, edges } })
  },

  clearGraph: () =>
    set({
      graph: { nodes: [], edges: [] },
      nodeLayoutOverrides: {},
      steps: [],
      currentStep: -1,
      isPlaying: false,
      startNode: '',
      endNode: '',
      finalPath: [],
      totalDistance: 0,
      selectedNodesMessage: '',
      lastResult: null,
    }),

  setStartNode: (node) =>
    set((s) => {
      const ids = new Set(s.graph.nodes.map((n) => n.id))
      const clear =
        Boolean(node) &&
        Boolean(s.endNode) &&
        ids.has(node) &&
        ids.has(s.endNode)
      return {
        startNode: node,
        ...(clear ? { nodeLayoutOverrides: {} } : {}),
      }
    }),

  setEndNode: (node) =>
    set((s) => {
      const ids = new Set(s.graph.nodes.map((n) => n.id))
      const clear =
        Boolean(s.startNode) &&
        Boolean(node) &&
        ids.has(s.startNode) &&
        ids.has(node)
      return {
        endNode: node,
        ...(clear ? { nodeLayoutOverrides: {} } : {}),
      }
    }),

  /**
   * Valida el grafo y los nodos, ejecuta Dijkstra y guarda pasos y resultado.
   * @returns {{ success: true } | { success: false, message: string }}
   */
  runDijkstra: () => {
    const state = get()
    const runCheck = validateDijkstraRun(
      state.graph,
      state.startNode,
      state.endNode,
    )
    if (!runCheck.ok) {
      return { success: false, message: runCheck.message }
    }

    const graphCheck = validateGraphForDijkstra(state.graph)
    if (!graphCheck.ok) {
      return { success: false, message: graphCheck.message }
    }

    const result = runDijkstraAlgorithm(
      state.graph,
      state.startNode,
      state.endNode,
    )

    set({
      steps: result.steps,
      finalPath: result.finalPath,
      allPaths: result.allPaths,
      selectedNodes: result.selectedNodes,
      totalDistance: result.totalDistance,
      currentStep: -1,
      isPlaying: false,
      selectedNodesMessage: '',
      lastResult: { ...result, startNode: state.startNode, endNode: state.endNode },
    })
    return { success: true }
  },

  setCurrentStep: (index) => set({ currentStep: index }),

  nextStep: () => {
    const { steps, currentStep } = get()
    if (!steps.length) return
    if (currentStep < 0) {
      set({ currentStep: 0 })
      return
    }
    if (currentStep < steps.length) {
      set({ currentStep: currentStep + 1 })
    }
  },

  /** Retrocede un paso en la simulación (hasta -1, antes del primer paso). */
  previousStep: () => {
    const { steps, currentStep } = get()
    if (!steps.length || currentStep < 0) return
    set({ currentStep: currentStep - 1 })
  },

  setIsPlaying: (bool) => set({ isPlaying: bool }),

  /**
   * Reinicia la visualización al estado previo a la animación (sin borrar el grafo ni los pasos).
   */
  reset: () =>
    set({
      currentStep: -1,
      isPlaying: false,
    }),
}))
