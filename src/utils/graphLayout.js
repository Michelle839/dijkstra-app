/**
 * Layout de grafos: circular por defecto, BFS por niveles cuando hay origen/destino.
 */

export function computeCircularLayout(nodes, width, height) {
  const cx = width / 2
  const cy = height / 2
  const r = Math.min(width, height) * 0.34

  if (!nodes.length) return {}
  if (nodes.length === 1) return { [nodes[0].id]: { x: cx, y: cy } }

  const sorted = [...nodes].sort((a, b) => a.id.localeCompare(b.id))
  const positions = {}
  sorted.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / sorted.length - Math.PI / 2
    positions[node.id] = {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    }
  })
  return positions
}

/**
 * BFS desde startId para asignar niveles a cada nodo.
 * El destino se fuerza al último nivel.
 */
function bfsLevels(nodeIds, edges, startId, endId) {
  // Construir adyacencia
  const adj = {}
  for (const id of nodeIds) adj[id] = []
  for (const e of edges) {
    adj[e.from].push(e.to)
    adj[e.to].push(e.from)
  }

  const level = {}
  const queue = [startId]
  level[startId] = 0

  while (queue.length > 0) {
    const u = queue.shift()
    for (const v of adj[u]) {
      if (level[v] === undefined) {
        level[v] = level[u] + 1
        queue.push(v)
      }
    }
  }

  // Nodos sin conexión con el origen → nivel máximo + 1
  const maxLevel = Math.max(0, ...Object.values(level))
  for (const id of nodeIds) {
    if (level[id] === undefined) level[id] = maxLevel + 1
  }

  // Forzar destino al nivel más alto para que quede a la derecha
  const destLevel = level[endId] ?? maxLevel
  const forcedMax = Math.max(destLevel, maxLevel)
  level[endId] = forcedMax

  return level
}

/**
 * Layout BFS por niveles: origen izquierda, destino derecha,
 * intermedios distribuidos en columnas según distancia topológica.
 */
export function computeBFSLayout(nodes, edges, width, height, startId, endId) {
  const nodeIds = nodes.map((n) => n.id)
  const ids = new Set(nodeIds)

  if (!startId || !endId || startId === endId || !ids.has(startId) || !ids.has(endId)) {
    return computeCircularLayout(nodes, width, height)
  }

  const level = bfsLevels(nodeIds, edges, startId, endId)

  // Agrupar nodos por nivel
  const byLevel = {}
  for (const id of nodeIds) {
    const l = level[id]
    if (!byLevel[l]) byLevel[l] = []
    byLevel[l].push(id)
  }

  const levels = Object.keys(byLevel).map(Number).sort((a, b) => a - b)
  const numLevels = levels.length

  const padX = width * 0.10
  const padY = height * 0.12
  const usableW = width - padX * 2
  const usableH = height - padY * 2

  const positions = {}

  levels.forEach((l, colIdx) => {
    const nodesInLevel = byLevel[l]
    const x = numLevels === 1
      ? width / 2
      : padX + (usableW * colIdx) / (numLevels - 1)

    nodesInLevel.forEach((id, rowIdx) => {
      const count = nodesInLevel.length
      // Centrar verticalmente el grupo de nodos de este nivel
      const groupH = Math.min(usableH, (count - 1) * 110)
      const groupTop = height / 2 - groupH / 2
      const y = count === 1
        ? height / 2
        : groupTop + (groupH * rowIdx) / (count - 1)
      positions[id] = { x, y }
    })
  })

  return positions
}

/**
 * Aplica fuerzas de repulsión suaves para evitar solapamiento.
 */
function applyRepulsion(positions, minDist = 72) {
  const ids = Object.keys(positions)
  const out = {}
  for (const id of ids) out[id] = { ...positions[id] }

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = out[ids[i]]
      const b = out[ids[j]]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const d = Math.hypot(dx, dy)
      if (d < minDist && d > 0) {
        const f = ((minDist - d) / d) * 0.45
        out[ids[i]] = { x: a.x - dx * f, y: a.y - dy * f }
        out[ids[j]] = { x: b.x + dx * f, y: b.y + dy * f }
      }
    }
  }
  return out
}

/**
 * Layout base + posiciones arrastradas (ratios 0–1).
 */
export function mergeLayoutWithOverrides(nodes, width, height, overrides, startId, endId, edges = []) {
  let base

  const ids = new Set(nodes.map((n) => n.id))
  const hasStartEnd = startId && endId && startId !== endId && ids.has(startId) && ids.has(endId)

  if (hasStartEnd && edges.length > 0) {
    base = computeBFSLayout(nodes, edges, width, height, startId, endId)
  } else {
    base = computeCircularLayout(nodes, width, height)
  }

  const out = { ...base }

  // Aplicar posiciones arrastradas
  if (overrides && typeof overrides === 'object') {
    for (const id of ids) {
      const o = overrides[id]
      if (o && typeof o.rx === 'number' && typeof o.ry === 'number' &&
          Number.isFinite(o.rx) && Number.isFinite(o.ry)) {
        out[id] = { x: o.rx * width, y: o.ry * height }
      }
    }
  }

  // Repulsión suave
  const repulsed = applyRepulsion(out)

  // Clamp dentro del canvas
  const margin = 44
  for (const id of ids) {
    const p = repulsed[id]
    if (p) {
      p.x = Math.max(margin, Math.min(width - margin, p.x))
      p.y = Math.max(margin, Math.min(height - margin, p.y))
    }
  }

  return repulsed
}
