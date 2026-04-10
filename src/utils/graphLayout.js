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
  const r = Math.min(width, height) * 0.36

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
