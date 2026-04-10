/**
 * Calcula posiciones (x, y) de los nodos en un círculo centrado en el área dada.
 */

/**
 * @param {Array<{ id: string }>} nodes
 * @param {number} width
 * @param {number} height
 * @returns {Record<string, { x: number, y: number }>}
 */
export function computeCircularLayout(nodes, width, height) {
  const cx = width / 2
  const cy = height / 2
  /* Radio un poco menor para dejar margen a etiquetas [d, pred] y leyendas bajo los nodos */
  const r = Math.min(width, height) * 0.31

  if (!nodes.length) return {}

  if (nodes.length === 1) {
    return { [nodes[0].id]: { x: cx, y: cy } }
  }

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
 * Aplica posiciones guardadas (ratios 0–1 del ancho/alto del canvas) sobre el layout circular.
 * @param {Array<{ id: string }>} nodes
 * @param {number} width
 * @param {number} height
 * @param {Record<string, { rx: number, ry: number }> | undefined} overrides
 * @returns {Record<string, { x: number, y: number }>}
 */
export function mergeCircularLayoutWithOverrides(nodes, width, height, overrides) {
  const base = computeCircularLayout(nodes, width, height)
  if (!overrides || typeof overrides !== 'object') return base

  const ids = new Set(nodes.map((n) => n.id))
  const out = { ...base }
  for (const id of ids) {
    const o = overrides[id]
    if (
      o &&
      typeof o.rx === 'number' &&
      typeof o.ry === 'number' &&
      Number.isFinite(o.rx) &&
      Number.isFinite(o.ry)
    ) {
      out[id] = { x: o.rx * width, y: o.ry * height }
    }
  }
  return out
}
