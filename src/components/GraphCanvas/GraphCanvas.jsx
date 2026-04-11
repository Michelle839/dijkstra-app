/**
 * Visualiza el grafo en canvas: paso a paso con [dist, pred], siguiente nodo elegido,
 * aristas evaluadas/actualizadas y estilo más claro y dinámico.
 */

import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { mergeLayoutWithOverrides } from '../../utils/graphLayout.js'
import { NODE_COLORS, EDGE_COLORS } from '../../constants/graphColors.js'
import './GraphCanvas.css'

const EDGE_EVALUATED_BASE = '#E8A317'
const EDGE_EVALUATED_BRIGHT = '#FFD54A'
const EDGE_RELAXED = '#C62828'
const NEXT_PICK_RING = '#F59E0B'
const BG_GRID = 'rgba(15, 23, 42, 0.04)'
const NODE_HIT_RADIUS = 26

/**
 * Nodo que el algoritmo tomará como `currentNode` en el paso siguiente (mínima distancia entre no visitados).
 * @param {object} step
 * @param {object | undefined} nextStep
 * @param {boolean} showPath
 */
function getSelectedNextNodeId(step, nextStep, showPath) {
  if (!step || showPath || !nextStep) return null
  return nextStep.currentNode
}

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

function undirectedPairMatches(eFrom, eTo, sFrom, sTo) {
  return (
    (eFrom === sFrom && eTo === sTo) ||
    (eFrom === sTo && eTo === sFrom)
  )
}

function edgeInStepList(graphEdge, list) {
  if (!list?.length) return false
  return list.some(({ from, to }) =>
    undirectedPairMatches(graphEdge.from, graphEdge.to, from, to),
  )
}

function edgeBendSign(eFrom, eTo) {
  const s = `${eFrom}|${eTo}`
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h + s.charCodeAt(i) * (i + 1)) % 7
  return h % 2 === 0 ? 1 : -1
}

/**
 * Punto de control para curvar la arista ligeramente (evita aspecto “rigido”).
 */
function edgeControlPoint(p0, p1, bendSign) {
  const mx = (p0.x + p1.x) / 2
  const my = (p0.y + p1.y) / 2
  const dx = p1.x - p0.x
  const dy = p1.y - p0.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const bend = Math.min(28, len * 0.12) * bendSign
  return { x: mx + nx * bend, y: my + ny * bend }
}

function quadPointAt(p0, cp, p1, t) {
  const o = 1 - t
  return {
    x: o * o * p0.x + 2 * o * t * cp.x + t * t * p1.x,
    y: o * o * p0.y + 2 * o * t * cp.y + t * t * p1.y,
  }
}

function normalizeVec(x, y) {
  const L = Math.hypot(x, y) || 1
  return { x: x / L, y: y / L }
}

function quadTangentAt(p0, cp, p1, t, forward) {
  const dt = 0.02
  const t0 = Math.max(0, t - dt)
  const t1 = Math.min(1, t + dt)
  const pa = quadPointAt(p0, cp, p1, t0)
  const pb = quadPointAt(p0, cp, p1, t1)
  const dx = forward ? pb.x - pa.x : pa.x - pb.x
  const dy = forward ? pb.y - pa.y : pa.y - pb.y
  return normalizeVec(dx, dy)
}

function pointAlongPolyline(pts, t) {
  if (!pts.length) return { x: 0, y: 0 }
  if (pts.length === 1) return pts[0]
  let total = 0
  const lens = []
  for (let i = 0; i < pts.length - 1; i++) {
    const len = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y)
    lens.push(len)
    total += len
  }
  if (total < 1e-6) return pts[0]
  let d = t * total
  for (let i = 0; i < lens.length; i++) {
    const len = lens[i] || 1e-6
    if (d <= len || i === lens.length - 1) {
      const u = Math.min(1, Math.max(0, d / len))
      const a = pts[i]
      const b = pts[i + 1]
      return { x: a.x + u * (b.x - a.x), y: a.y + u * (b.y - a.y) }
    }
    d -= len
  }
  return pts[pts.length - 1]
}

function polylineTangentAt(pts, t, forward) {
  const dt = 0.015
  const t0 = Math.max(0, t - dt)
  const t1 = Math.min(1, t + dt)
  const pa = pointAlongPolyline(pts, t0)
  const pb = pointAlongPolyline(pts, t1)
  const dx = forward ? pb.x - pa.x : pa.x - pb.x
  const dy = forward ? pb.y - pa.y : pa.y - pb.y
  return normalizeVec(dx, dy)
}

/**
 * Verifica si una arista pertenece a alguno de los caminos más cortos en allPaths.
 */
function isAllPathsEdge(from, to, allPaths) {
  if (!allPaths) return false
  for (const { path } of Object.values(allPaths)) {
    if (!path || path.length < 2) continue
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i]
      const b = path[i + 1]
      if ((a === from && b === to) || (a === to && b === from)) return true
    }
  }
  return false
}

function edgeStyle(e, state) {
  const onPath =
    state.showPath && isPathEdge(e.from, e.to, state.finalPath)
  const onAllPaths =
    state.showPath && isAllPathsEdge(e.from, e.to, state.allPaths)

  if (onPath || onAllPaths) {
    return { stroke: EDGE_COLORS.path, lineWidth: 4, glow: 'rgba(216, 90, 48, 0.45)' }
  }

  const inUpdated =
    state.step && edgeInStepList(e, state.step.edgesUpdated)
  if (inUpdated) {
    return { stroke: EDGE_RELAXED, lineWidth: 4.5, glow: 'rgba(198, 40, 40, 0.25)' }
  }

  const inEval =
    state.step && edgeInStepList(e, state.step.edgesEvaluated)
  if (inEval) {
    const t = state.pulse
    const stroke =
      t < 0.5 ? EDGE_EVALUATED_BASE : EDGE_EVALUATED_BRIGHT
    return { stroke, lineWidth: 3 + t * 1.5, glow: 'rgba(232, 163, 23, 0.5)' }
  }

  return { stroke: EDGE_COLORS.default, lineWidth: 2.2 }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{ from: string, to: string, weight: number }>} edges
 * @param {Record<string, { x: number, y: number }>} layout
 * @param {{ showPath: boolean, finalPath: string[], step: object | null, pulse: number }} state
 * @param {string | null} currentNode
 * @param {'straight' | 'curved' | 'step'} renderMode
 */
function drawEdges(ctx, edges, layout, state, currentNode, renderMode) {
  for (const e of edges) {
    const p0 = layout[e.from]
    const p1 = layout[e.to]
    if (!p0 || !p1) continue

    const style = edgeStyle(e, state)

    /** @type {{ x: number, y: number }} */
    let labelPoint
    /** @type {(forward: boolean) => { q: { x: number, y: number }, tan: { x: number, y: number } }} */
    let arrowSampler

    ctx.save()
    ctx.beginPath()

    if (renderMode === 'straight') {
      ctx.moveTo(p0.x, p0.y)
      ctx.lineTo(p1.x, p1.y)
      labelPoint = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 }
      const poly = [p0, p1]
      arrowSampler = (forward) => ({
        q: pointAlongPolyline(poly, forward ? 0.38 : 0.62),
        tan: polylineTangentAt(poly, forward ? 0.38 : 0.62, forward),
      })
    } else if (renderMode === 'step') {
      const midX = (p0.x + p1.x) / 2
      const k1 = { x: midX, y: p0.y }
      const k2 = { x: midX, y: p1.y }
      ctx.moveTo(p0.x, p0.y)
      ctx.lineTo(k1.x, k1.y)
      ctx.lineTo(k2.x, k2.y)
      ctx.lineTo(p1.x, p1.y)
      labelPoint = { x: midX, y: (p0.y + p1.y) / 2 }
      const poly = [p0, k1, k2, p1]
      arrowSampler = (forward) => ({
        q: pointAlongPolyline(poly, forward ? 0.35 : 0.65),
        tan: polylineTangentAt(poly, forward ? 0.35 : 0.65, forward),
      })
    } else {
      const bend = edgeBendSign(e.from, e.to)
      const cp = edgeControlPoint(p0, p1, bend)
      ctx.moveTo(p0.x, p0.y)
      ctx.quadraticCurveTo(cp.x, cp.y, p1.x, p1.y)
      labelPoint = quadPointAt(p0, cp, p1, 0.5)
      arrowSampler = (forward) => ({
        q: quadPointAt(p0, cp, p1, forward ? 0.38 : 0.62),
        tan: quadTangentAt(p0, cp, p1, forward ? 0.38 : 0.62, forward),
      })
    }

    if (style.glow) {
      ctx.shadowColor = style.glow
      ctx.shadowBlur = 10
    }

    ctx.strokeStyle = style.stroke
    ctx.lineWidth = style.lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    ctx.restore()

    const wStr = String(e.weight)
    ctx.font = '600 11px system-ui, sans-serif'
    const tw = ctx.measureText(wStr).width
    const pw = tw + 10
    const ph = 18
    ctx.save()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.1)'
    ctx.lineWidth = 1
    ctx.beginPath()
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(
        labelPoint.x - pw / 2,
        labelPoint.y - ph / 2,
        pw,
        ph,
        8,
      )
    } else {
      ctx.rect(labelPoint.x - pw / 2, labelPoint.y - ph / 2, pw, ph)
    }
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#334155'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(wStr, labelPoint.x, labelPoint.y)
    ctx.restore()

    const inEval =
      state.step &&
      currentNode &&
      edgeInStepList(e, state.step.edgesEvaluated) &&
      (e.from === currentNode || e.to === currentNode)
    if (inEval && arrowSampler) {
      const forward = currentNode === e.from
      const { q, tan } = arrowSampler(forward)
      const ux = tan.x
      const uy = tan.y
      ctx.save()
      ctx.fillStyle = style.stroke
      ctx.beginPath()
      const s = 5
      ctx.moveTo(q.x + ux * s, q.y + uy * s)
      ctx.lineTo(
        q.x - ux * s + -uy * (s * 0.65),
        q.y - uy * s + ux * (s * 0.65),
      )
      ctx.lineTo(
        q.x - ux * s - -uy * (s * 0.65),
        q.y - uy * s - ux * (s * 0.65),
      )
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
  }
}

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
 * @param {{
 *   step: object | null,
 *   showPath: boolean,
 *   finalPath: string[],
 *   startNode: string,
 *   endNode: string,
 *   selectedNext: string | null,
 *   pulse: number,
 * }} state
 */
function drawNodes(ctx, nodes, layout, state) {
  const radius = NODE_HIT_RADIUS
  const pulse = state.pulse

  for (const n of nodes) {
    const p = layout[n.id]
    if (!p) continue

    const isNextPick = state.selectedNext === n.id
    const isCurrent = state.step?.currentNode === n.id

    if (isNextPick && !state.showPath) {
      const ringPulse = 4 + pulse * 5
      ctx.save()
      ctx.beginPath()
      ctx.arc(p.x, p.y, radius + 8 + ringPulse * 0.3, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(245, 158, 11, ${0.35 + pulse * 0.25})`
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(p.x, p.y, radius + 5, 0, Math.PI * 2)
      ctx.strokeStyle = NEXT_PICK_RING
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.restore()
    }

    if (isCurrent) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(p.x, p.y, radius + 4, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(24, 95, 165, ${0.45 + pulse * 0.2})`
      ctx.lineWidth = 4
      ctx.stroke()
      ctx.restore()
    }

    const fill = (() => {
      // Al final del algoritmo, mostrar todos los caminos más cortos en rojo
      if (state.showPath && state.allPaths && state.allPaths[n.id]) {
        return NODE_COLORS.path
      }
      // También mostrar nodos visitados que no tienen camino (inalcanzables)
      if (state.showPath && state.step && state.step.visited.includes(n.id)) {
        return NODE_COLORS.path
      }
      if (state.step && state.step.currentNode === n.id) {
        return NODE_COLORS.current
      }
      // Durante el proceso, los nodos visitados aparecen en verde
      if (state.step && state.step.visited.includes(n.id)) {
        return NODE_COLORS.visited
      }
      if (n.id === state.startNode || n.id === state.endNode) {
        return NODE_COLORS.endpoint
      }
      return NODE_COLORS.default
    })()

    const grad = ctx.createRadialGradient(
      p.x - radius * 0.35,
      p.y - radius * 0.35,
      2,
      p.x,
      p.y,
      radius + 2,
    )
    grad.addColorStop(0, lightenColor(fill, 0.22))
    grad.addColorStop(0.55, fill)
    grad.addColorStop(1, darkenColor(fill, 0.12))

    ctx.beginPath()
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
    ctx.fillStyle = grad
    ctx.fill()
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.font = 'bold 17px system-ui, sans-serif'
    ctx.fillStyle = '#fff'
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = 3
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(n.id, p.x, p.y)
    ctx.shadowBlur = 0

    if (state.step?.distances && state.step?.previousNodes) {
      const line1 = formatDistancePredLabel(n.id, state.step)
      const lines = [line1]
      if (isNextPick && !state.showPath) {
        lines.push('Nodo seleccionado')
      }

      ctx.font = '600 10.5px ui-monospace, "Cascadia Code", Consolas, monospace'
      const lineHeight = 13
      const padX = 8
      let maxW = 0
      for (const line of lines) {
        maxW = Math.max(maxW, ctx.measureText(line).width)
      }
      const bw = Math.ceil(maxW + padX * 2)
      const bh = 8 + lines.length * lineHeight
      const bx = p.x - bw / 2
      const by = p.y + radius + 8

      ctx.save()
      const bg = isNextPick && !state.showPath
        ? 'rgba(255, 251, 235, 0.98)'
        : 'rgba(255, 255, 255, 0.96)'
      const border = isNextPick && !state.showPath
        ? 'rgba(245, 158, 11, 0.55)'
        : 'rgba(15, 23, 42, 0.12)'
      ctx.fillStyle = bg
      ctx.strokeStyle = border
      ctx.lineWidth = isNextPick && !state.showPath ? 2 : 1
      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(bx, by, bw, bh, 8)
      } else {
        ctx.rect(bx, by, bw, bh)
      }
      ctx.fill()
      ctx.stroke()

      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (let i = 0; i < lines.length; i++) {
        const ly = by + 6 + lineHeight / 2 + i * lineHeight
        if (i === 0) {
          ctx.fillStyle = '#0f172a'
          ctx.font =
            '600 10.5px ui-monospace, "Cascadia Code", Consolas, monospace'
        } else {
          ctx.fillStyle = '#92400e'
          ctx.font = '600 9.5px system-ui, sans-serif'
        }
        ctx.fillText(lines[i], p.x, ly)
      }
      ctx.restore()
    }
  }
}

/** Aclara un hex #RRGGBB */
function lightenColor(hex, amount) {
  const rgb = parseHex(hex)
  if (!rgb) return hex
  return toHex(
    Math.min(255, rgb.r + (255 - rgb.r) * amount),
    Math.min(255, rgb.g + (255 - rgb.g) * amount),
    Math.min(255, rgb.b + (255 - rgb.b) * amount),
  )
}

function darkenColor(hex, amount) {
  const rgb = parseHex(hex)
  if (!rgb) return hex
  return toHex(
    rgb.r * (1 - amount),
    rgb.g * (1 - amount),
    rgb.b * (1 - amount),
  )
}

function parseHex(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return null
  const n = parseInt(m[1], 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function toHex(r, g, b) {
  const c = (x) =>
    Math.round(x)
      .toString(16)
      .padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

function drawBackgroundMesh(ctx, w, h) {
  ctx.save()
  const step = 28
  ctx.strokeStyle = BG_GRID
  ctx.lineWidth = 1
  for (let x = 0; x <= w; x += step) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
    ctx.stroke()
  }
  for (let y = 0; y <= h; y += step) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }
  ctx.restore()
}

function buildDrawState(slice) {
  const { graph, currentStep, steps, finalPath, allPaths, startNode, endNode } = slice
  const step =
    currentStep >= 0 && steps[currentStep] ? steps[currentStep] : null
  const nextStep =
    currentStep >= 0 && steps[currentStep + 1] ? steps[currentStep + 1] : null
  const showPath =
    steps.length > 0 && currentStep === steps.length - 1 && currentStep >= 0
  
  const selectedNext = getSelectedNextNodeId(step, nextStep, showPath)

  return {
    graph,
    step,
    nextStep,
    showPath,
    finalPath,
    allPaths,
    startNode,
    endNode,
    selectedNext,
  }
}

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

  const g = ctx.createLinearGradient(0, 0, size.w, size.h)
  g.addColorStop(0, '#f8fafc')
  g.addColorStop(0.5, '#f1f5f9')
  g.addColorStop(1, '#e2e8f0')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size.w, size.h)
  drawBackgroundMesh(ctx, size.w, size.h)

  const layout = mergeLayoutWithOverrides(
    drawSlice.graph.nodes,
    size.w,
    size.h,
    drawSlice.nodeLayoutOverrides,
    drawSlice.startNode,
    drawSlice.endNode,
  )

  const edgeState = {
    showPath: drawSlice.showPath,
    finalPath: drawSlice.finalPath,
    allPaths: drawSlice.allPaths,
    step: drawSlice.step,
    pulse,
  }

  const nodeState = {
    step: drawSlice.step,
    showPath: drawSlice.showPath,
    finalPath: drawSlice.finalPath,
    allPaths: drawSlice.allPaths,
    startNode: drawSlice.startNode,
    endNode: drawSlice.endNode,
    selectedNext: drawSlice.selectedNext,
    pulse,
  }

  const currentNode = drawSlice.step?.currentNode ?? null
  drawEdges(
    ctx,
    drawSlice.graph.edges,
    layout,
    edgeState,
    currentNode,
    drawSlice.edgeRenderMode,
  )
  drawNodes(ctx, drawSlice.graph.nodes, layout, nodeState)
}

export function GraphCanvas() {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [size, setSize] = useState({ w: 400, h: 400 })

  const graph = useStore((s) => s.graph)
  const nodeLayoutOverrides = useStore((s) => s.nodeLayoutOverrides)
  const setNodeLayoutOverride = useStore((s) => s.setNodeLayoutOverride)
  const currentStep = useStore((s) => s.currentStep)
  const steps = useStore((s) => s.steps)
  const finalPath = useStore((s) => s.finalPath)
  const allPaths = useStore((s) => s.allPaths)
  const startNode = useStore((s) => s.startNode)
  const endNode = useStore((s) => s.endNode)
  const edgeRenderMode = useStore((s) => s.edgeRenderMode)

  const dragRef = useRef({ id: null, offX: 0, offY: 0 })

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

    const drawSlice = {
      ...buildDrawState({
        graph,
        currentStep,
        steps,
        finalPath,
        allPaths,
        startNode,
        endNode,
      }),
      nodeLayoutOverrides,
      edgeRenderMode,
    }

    const step = drawSlice.step
    const shouldPulse =
      currentStep >= 0 &&
      !drawSlice.showPath &&
      (Boolean(step?.edgesEvaluated?.length) ||
        Boolean(drawSlice.selectedNext))

    const runPaint = (pulseVal) => {
      paintFrame(canvas, size, drawSlice, pulseVal)
    }

    if (!shouldPulse) {
      runPaint(0.5)
      return undefined
    }

    let rafId = 0
    const loop = (t) => {
      const pulseVal = 0.5 + 0.5 * Math.sin(t / 320)
      runPaint(pulseVal)
      rafId = window.requestAnimationFrame(loop)
    }
    rafId = window.requestAnimationFrame(loop)
    return () => window.cancelAnimationFrame(rafId)
  }, [
    graph,
    nodeLayoutOverrides,
    currentStep,
    finalPath,
    allPaths,
    steps,
    startNode,
    endNode,
    edgeRenderMode,
    size,
  ])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const layoutNow = () => {
      const st = useStore.getState()
      return mergeLayoutWithOverrides(
        st.graph.nodes,
        size.w,
        size.h,
        st.nodeLayoutOverrides,
        st.startNode,
        st.endNode,
      )
    }

    const toLocal = (clientX, clientY) => {
      const r = canvas.getBoundingClientRect()
      return { x: clientX - r.left, y: clientY - r.top }
    }

    const hitNode = (x, y) => {
      const nodes = useStore.getState().graph.nodes
      const layout = layoutNow()
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i]
        const p = layout[n.id]
        if (!p) continue
        const d2 = (x - p.x) ** 2 + (y - p.y) ** 2
        if (d2 <= (NODE_HIT_RADIUS + 8) ** 2) return { id: n.id, p }
      }
      return null
    }

    const onPointerDown = (e) => {
      if (e.button !== 0) return
      const { x, y } = toLocal(e.clientX, e.clientY)
      const hit = hitNode(x, y)
      if (hit) {
        dragRef.current = {
          id: hit.id,
          offX: x - hit.p.x,
          offY: y - hit.p.y,
        }
        canvas.style.cursor = 'grabbing'
        canvas.setPointerCapture(e.pointerId)
        e.preventDefault()
      }
    }

    const onPointerMove = (e) => {
      const d = dragRef.current
      const { x, y } = toLocal(e.clientX, e.clientY)

      if (!d.id) {
        const h = hitNode(x, y)
        canvas.style.cursor = h ? 'grab' : 'default'
        return
      }

      const nx = x - d.offX
      const ny = y - d.offY
      const w = size.w
      const hgt = size.h
      const rx = Math.min(0.96, Math.max(0.04, nx / w))
      const ry = Math.min(0.96, Math.max(0.04, ny / hgt))
      setNodeLayoutOverride(d.id, rx, ry)
    }

    const endDrag = (e) => {
      const d = dragRef.current
      if (!d.id) return
      dragRef.current = { id: null, offX: 0, offY: 0 }
      canvas.style.cursor = 'default'
      try {
        if (canvas.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId)
        }
      } catch {
        /* ignore */
      }
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', endDrag)
    canvas.addEventListener('pointercancel', endDrag)
    const onLeave = () => {
      if (!dragRef.current.id) canvas.style.cursor = 'default'
    }
    canvas.addEventListener('pointerleave', onLeave)

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', endDrag)
      canvas.removeEventListener('pointercancel', endDrag)
      canvas.removeEventListener('pointerleave', onLeave)
    }
  }, [graph, size.w, size.h, setNodeLayoutOverride, startNode, endNode])

  return (
    <div
      ref={containerRef}
      className="graph-canvas-wrap"
      title="Arrastra los nodos para colocarlos donde prefieras"
    >
      <canvas
        ref={canvasRef}
        className="graph-canvas"
        aria-label="Grafo: arrastra los nodos para reorganizarlos"
      />
    </div>
  )
}
