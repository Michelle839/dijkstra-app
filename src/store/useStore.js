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

export const useStore = create((set, get) => ({
  graph: { nodes: [], edges: [] },
  steps: [],
  currentStep: -1,
  isPlaying: false,
  startNode: '',
  endNode: '',
  finalPath: [],
  totalDistance: 0,

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

    const edges = [...graph.edges, { from: a, to: b, weight: Number(weight) }]
    const idSet = new Set(graph.nodes.map((n) => n.id))
    idSet.add(fromId)
    idSet.add(toId)
    const nodes = [...idSet].sort().map((id) => ({ id }))
    set({ graph: { nodes, edges } })
  },

  clearGraph: () =>
    set({
      graph: { nodes: [], edges: [] },
      steps: [],
      currentStep: -1,
      isPlaying: false,
      startNode: '',
      endNode: '',
      finalPath: [],
      totalDistance: 0,
    }),

  setStartNode: (node) => set({ startNode: node }),
  setEndNode: (node) => set({ endNode: node }),

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
      totalDistance: result.totalDistance,
      currentStep: -1,
      isPlaying: false,
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
    if (currentStep < steps.length - 1) {
      set({ currentStep: currentStep + 1 })
    }
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
