/**
 * Visualiza el grafo en un canvas HTML5. Solo lectura del store: redibuja cuando cambia el estado.
 * Las funciones drawEdges / drawNodes concentran el dibujo geométrico.
 * Las aristas reflejan edgesEvaluated / edgesUpdated del paso actual y la ruta final.
 */

import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { computeCircularLayout } from '../../utils/graphLayout.js'
import { NODE_COLORS, EDGE_COLORS } from '../../constants/graphColors.js'
import './GraphCanvas.css'

/** Aristas en evaluación (desde el nodo actual): tono ámbar con leve pulso. */
const EDGE_EVALUATED_BASE = '#E8A317'
const EDGE_EVALUATED_BRIGHT = '#FFD54A'
/** Arista que mejoró distancia: rojo intenso (por debajo de la ruta final). */
const EDGE_RELAXED = '#B22222'

/**
 * @param {string} from
 * @param {string} to
 * @param {string[]} finalPath
 */
function isPathEdge(from, to, finalPath) {
  for (let i = 0; i < finalPath.length - 1; i++) {
    const a = finalPath[i]
    const b = finalPath[i + 1]
    if (
      (a === from && b === to) ||
      (a === to && b === from)
    ) {
      return true
    }
  }
  return false
}

/**
 * ¿La arista del grafo coincide con el par (from,to) del paso? (no dirigida)
 * @param {string} eFrom
 * @param {string} eTo
 * @param {string} sFrom
 * @param {string} sTo
 */
function undirectedPairMatches(eFrom, eTo, sFrom, sTo) {
  return (
    (eFrom === sFrom && eTo === sTo) ||
    (eFrom === sTo && eTo === sFrom)
  )
}

/**
 * @param {{ from: string, to: string }} graphEdge
 * @param {Array<{ from: string, to: string }> | undefined} list
 */
function edgeInStepList(graphEdge, list) {
  if (!list?.length) return false
  return list.some(({ from, to }) =>
    undirectedPairMatches(graphEdge.from, graphEdge.to, from, to),
  )
}

/**
 * Prioridad: ruta final > aristas actualizadas > aristas evaluadas > default.
 * @param {{ from: string, to: string, weight: number }} e
 * @param {{ showPath: boolean, finalPath: string[], step: object | null, pulse: number }} state
 * @returns {{ stroke: string, lineWidth: number, glow?: string }}
 */
function edgeStyle(e, state) {
  const onPath =
    state.showPath && isPathEdge(e.from, e.to, state.finalPath)
  if (onPath) {
    return { stroke: EDGE_COLORS.path, lineWidth: 3.5 }
  }

  const inUpdated =
    state.step && edgeInStepList(e, state.step.edgesUpdated)
  if (inUpdated) {
    return { stroke: EDGE_RELAXED, lineWidth: 4 }
  }

  const inEval =
    state.step && edgeInStepList(e, state.step.edgesEvaluated)
  if (inEval) {
    const t = state.pulse
    const stroke =
      t < 0.5 ? EDGE_EVALUATED_BASE : EDGE_EVALUATED_BRIGHT
    return { stroke, lineWidth: 2.5 + t * 1.2, glow: 'rgba(232, 163, 23, 0.45)' }
  }

  return { stroke: EDGE_COLORS.default, lineWidth: 2 }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{ from: string, to: string, weight: number }>} edges
 * @param {Record<string, { x: number, y: number }>} layout
 * @param {{ showPath: boolean, finalPath: string[], step: object | null, pulse: number }} state
 */
function drawEdges(ctx, edges, layout, state) {
  for (const e of edges) {
    const p0 = layout[e.from]
    const p1 = layout[e.to]
    if (!p0 || !p1) continue

    const style = edgeStyle(e, state)

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(p0.x, p0.y)
    ctx.lineTo(p1.x, p1.y)

    if (style.glow) {
      ctx.shadowColor = style.glow
      ctx.shadowBlur = 8
    }

    ctx.strokeStyle = style.stroke
    ctx.lineWidth = style.lineWidth
    ctx.stroke()
    ctx.restore()

    const mx = (p0.x + p1.x) / 2
    const my = (p0.y + p1.y) / 2
    ctx.font = '12px system-ui, sans-serif'
    ctx.fillStyle = '#2a2925'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(e.weight), mx, my)
  }
}

/**
 * @param {string} id
 * @param {{ step: object | null, showPath: boolean, finalPath: string[], startNode: string, endNode: string }} s
 */
function nodeFillColor(id, s) {
  if (s.showPath && s.finalPath.includes(id)) return NODE_COLORS.path
  if (s.step && s.step.currentNode === id) return NODE_COLORS.current
  if (s.step && s.step.visited.includes(id)) return NODE_COLORS.visited
  if (id === s.startNode || id === s.endNode) return NODE_COLORS.endpoint
  return NODE_COLORS.default
}

/**
 * Etiqueta tipo pizarra: [distancia, predecesor] con "-" si no hay predecesor.
 * @param {string} nodeId
 * @param {{ distances: Record<string, number>, previousNodes: Record<string, string | null> }} step
 */
function formatDistancePredLabel(nodeId, step) {
  const d = step.distances[nodeId]
  const prev = step.previousNodes[nodeId]
  const dStr = Number.isFinite(d) ? String(d) : '∞'
  const pStr = prev == null ? '-' : String(prev)
  return `[${dStr}, ${pStr}]`
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{ id: string }>} nodes
 * @param {Record<string, { x: number, y: number }>} layout
 * @param {{ step: object | null, showPath: boolean, finalPath: string[], startNode: string, endNode: string }} state
 */
function drawNodes(ctx, nodes, layout, state) {
  const radius = 22
  for (const n of nodes) {
    const p = layout[n.id]
    if (!p) continue

    const fill = nodeFillColor(n.id, state)
    ctx.beginPath()
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
    ctx.fillStyle = fill
    ctx.fill()
    ctx.strokeStyle = '#1a1916'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.font = 'bold 16px system-ui, sans-serif'
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(n.id, p.x, p.y)

    if (state.step?.distances && state.step?.previousNodes) {
      const label = formatDistancePredLabel(n.id, state.step)
      ctx.font = '600 10px ui-monospace, "Cascadia Code", Consolas, monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const metrics = ctx.measureText(label)
      const padX = 6
      const bw = Math.ceil(metrics.width + padX * 2)
      const bh = 16
      const bx = p.x - bw / 2
      const by = p.y + radius + 6

      ctx.save()
      ctx.fillStyle = 'rgba(255, 255, 255, 0.94)'
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.14)'
      ctx.lineWidth = 1
      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(bx, by, bw, bh, 5)
      } else {
        ctx.rect(bx, by, bw, bh)
      }
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#0f172a'
      ctx.fillText(label, p.x, by + bh / 2)
      ctx.restore()
    }
  }
}

/**
 * @param {{ graph: object, currentStep: number, steps: object[], finalPath: string[], startNode: string, endNode: string }} slice
 */
function buildDrawState(slice) {
  const { graph, currentStep, steps, finalPath, startNode, endNode } = slice
  const step =
    currentStep >= 0 && steps[currentStep] ? steps[currentStep] : null
  const showPath =
    steps.length > 0 && currentStep === steps.length - 1 && currentStep >= 0
  return {
    graph,
    step,
    showPath,
    finalPath,
    startNode,
    endNode,
  }
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ w: number, h: number }} size
 * @param {ReturnType<typeof buildDrawState>} drawSlice
 * @param {number} pulse 0..1 para interpolar aristas evaluadas
 */
function paintFrame(canvas, size, drawSlice, pulse) {
  const dpr = window.devicePixelRatio || 1
  canvas.width = size.w * dpr
  canvas.height = size.h * dpr
  canvas.style.width = `${size.w}px`
  canvas.style.height = `${size.h}px`

  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, size.w, size.h)

  const layout = computeCircularLayout(
    drawSlice.graph.nodes,
    size.w,
    size.h,
  )

  const edgeState = {
    showPath: drawSlice.showPath,
    finalPath: drawSlice.finalPath,
    step: drawSlice.step,
    pulse,
  }

  const nodeState = {
    step: drawSlice.step,
    showPath: drawSlice.showPath,
    finalPath: drawSlice.finalPath,
    startNode: drawSlice.startNode,
    endNode: drawSlice.endNode,
  }

  drawEdges(ctx, drawSlice.graph.edges, layout, edgeState)
  drawNodes(ctx, drawSlice.graph.nodes, layout, nodeState)
}

export function GraphCanvas() {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [size, setSize] = useState({ w: 400, h: 400 })

  const graph = useStore((s) => s.graph)
  const currentStep = useStore((s) => s.currentStep)
  const steps = useStore((s) => s.steps)
  const finalPath = useStore((s) => s.finalPath)
  const startNode = useStore((s) => s.startNode)
  const endNode = useStore((s) => s.endNode)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return undefined
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      setSize({
        w: Math.max(100, Math.floor(r.width)),
        h: Math.max(100, Math.floor(r.height)),
      })
    })
    ro.observe(el)
    const r = el.getBoundingClientRect()
    setSize({
      w: Math.max(100, Math.floor(r.width)),
      h: Math.max(100, Math.floor(r.height)),
    })
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const drawSlice = buildDrawState({
      graph,
      currentStep,
      steps,
      finalPath,
      startNode,
      endNode,
    })

    const step = drawSlice.step
    const shouldPulse =
      Boolean(step?.edgesEvaluated?.length) &&
      currentStep >= 0 &&
      !drawSlice.showPath

    const runPaint = (pulse) => {
      paintFrame(canvas, size, drawSlice, pulse)
    }

    if (!shouldPulse) {
      runPaint(0.5)
      return undefined
    }

    let rafId = 0
    const loop = (t) => {
      const pulse = 0.5 + 0.5 * Math.sin(t / 280)
      runPaint(pulse)
      rafId = window.requestAnimationFrame(loop)
    }
    rafId = window.requestAnimationFrame(loop)
    return () => window.cancelAnimationFrame(rafId)
  }, [graph, currentStep, finalPath, steps, startNode, endNode, size])

  return (
    <div ref={containerRef} className="graph-canvas-wrap">
      <canvas ref={canvasRef} className="graph-canvas" aria-label="Grafo" />
    </div>
  )
}
