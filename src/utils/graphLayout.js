/**
 * Posiciones de nodos: círculo por defecto, o fila inicio (izq.) → destino (der.) si ambos están definidos.
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
 * Origen a la izquierda, destino a la derecha; el resto repartidos en el centro.
 * @param {Array<{ id: string }>} nodes
 * @param {number} width
 * @param {number} height
 * @param {string} startId
 * @param {string} endId
 */
export function computeStartEndHorizontalLayout(
  nodes,
  width,
  height,
  startId,
  endId,
) {
  const ids = new Set(nodes.map((n) => n.id))
  if (
    !startId ||
    !endId ||
    startId === endId ||
    !ids.has(startId) ||
    !ids.has(endId)
  ) {
    return computeCircularLayout(nodes, width, height)
  }

  console.log('Aplicando layout simplificado para nodos:', { startId, endId, totalNodes: nodes.length })

  // Usar solo el área del grafo (donde termina el chat a la derecha)
  // Asumimos que el chat está colapsado (más espacio para el grafo)
  const usableWidth = width * 0.90  // 90% del ancho para el grafo, 10% para chat colapsado
  const usableHeight = height * 0.65  // 65% del alto para el grafo, 35% para controles
  const chatWidth = width * 0.10  // Espacio ocupado por el chat colapsado a la izquierda
  
  const padding = usableWidth * 0.08  // Padding dentro del área del grafo
  const marginY = usableHeight * 0.10  // Margen vertical dentro del área usable
  
  // Posicionar origen y destino dentro del área del grafo (no del canvas completo)
  const leftX = chatWidth + Math.max(padding, usableWidth * 0.20)  // 20% del área del grafo
  const rightX = chatWidth + Math.min(usableWidth - padding, usableWidth * 0.80)  // 80% del área del grafo
  const centerY = usableHeight / 2  // Centrar en el área usable del grafo

  const positions = {}
  positions[startId] = { x: leftX, y: centerY }
  positions[endId] = { x: rightX, y: centerY }

  const others = nodes
    .map((n) => n.id)
    .filter((id) => id !== startId && id !== endId)
    .sort()

  const nO = others.length
  if (nO === 0) return positions

  // Distribución muy drástica y visible para nodos intermedios
  const centerX = chatWidth + usableWidth / 2  // Centro del área del grafo
  const maxRadius = Math.min(usableWidth * 0.35, usableHeight * 0.4)  // Radio grande para separación clara
  
  others.forEach((id, i) => {
    let x, y
    
    if (nO === 1) {
      // 1 nodo: perfectamente centrado
      x = centerX
      y = centerY
    } else if (nO === 2) {
      // 2 nodos: muy separados verticalmente
      x = centerX
      y = i === 0 ? centerY - maxRadius * 0.8 : centerY + maxRadius * 0.8
    } else if (nO === 3) {
      // 3 nodos: triángulo grande y bien separado
      const positions = [
        { x: centerX, y: centerY - maxRadius * 0.7 }, // arriba
        { x: centerX - maxRadius * 0.6, y: centerY + maxRadius * 0.5 }, // abajo-izquierda
        { x: centerX + maxRadius * 0.6, y: centerY + maxRadius * 0.5 }, // abajo-derecha
      ]
      const pos = positions[i]
      x = pos.x
      y = pos.y
    } else if (nO === 4) {
      // 4 nodos: cuadrado grande
      const positions = [
        { x: centerX - maxRadius * 0.6, y: centerY - maxRadius * 0.6 }, // arriba-izquierda
        { x: centerX + maxRadius * 0.6, y: centerY - maxRadius * 0.6 }, // arriba-derecha
        { x: centerX - maxRadius * 0.6, y: centerY + maxRadius * 0.6 }, // abajo-izquierda
        { x: centerX + maxRadius * 0.6, y: centerY + maxRadius * 0.6 }, // abajo-derecha
      ]
      const pos = positions[i]
      x = pos.x
      y = pos.y
    } else if (nO === 5) {
      // 5 nodos: pentágono
      const angle = (2 * Math.PI * i) / nO - Math.PI / 2
      x = centerX + maxRadius * 0.7 * Math.cos(angle)
      y = centerY + maxRadius * 0.7 * Math.sin(angle)
    } else if (nO === 6) {
      // 6 nodos: hexágono
      const angle = (2 * Math.PI * i) / nO
      x = centerX + maxRadius * 0.8 * Math.cos(angle)
      y = centerY + maxRadius * 0.8 * Math.sin(angle)
    } else {
      // 7+ nodos: círculo grande
      const angle = (2 * Math.PI * i) / nO - Math.PI / 2
      x = centerX + maxRadius * Math.cos(angle)
      y = centerY + maxRadius * Math.sin(angle)
    }
    
    // Asegurar dentro de los límites del área del grafo
    const finalX = Math.max(chatWidth + padding, Math.min(chatWidth + usableWidth - padding, x))
    const finalY = Math.max(marginY, Math.min(usableHeight - marginY, y))
    
    console.log(`Nodo intermedio ${id}: x=${finalX.toFixed(1)}, y=${finalY.toFixed(1)} (radio: ${maxRadius.toFixed(1)})`)
    positions[id] = { x: finalX, y: finalY }
  })

  return positions
}

/**
 * @param {Array<{ id: string }>} nodes
 * @param {number} width
 * @param {number} height
 * @param {string} startId
 * @param {string} endId
 */
export function computeBaseLayout(nodes, width, height, startId, endId) {
  // Si hay origen y destino válidos, usar layout optimizado
  if (startId && endId && startId !== endId) {
    const ids = new Set(nodes.map((n) => n.id))
    if (ids.has(startId) && ids.has(endId)) {
      return computeStartEndHorizontalLayout(nodes, width, height, startId, endId)
    }
  }
  
  // Sino, usar layout circular
  return computeCircularLayout(nodes, width, height)
}

/**
 * Aplica fuerzas de repulsión entre nodos para evitar superposición
 */
function applyRepulsionForces(positions, minDistance = 80) {
  const nodeIds = Object.keys(positions)
  const adjusted = { ...positions }
  
  for (let i = 0; i < nodeIds.length; i++) {
    for (let j = i + 1; j < nodeIds.length; j++) {
      const id1 = nodeIds[i]
      const id2 = nodeIds[j]
      const p1 = adjusted[id1]
      const p2 = adjusted[id2]
      
      const dx = p2.x - p1.x
      const dy = p2.y - p1.y
      const distance = Math.hypot(dx, dy)
      
      if (distance < minDistance && distance > 0) {
        const force = (minDistance - distance) / distance * 0.5
        const fx = dx * force
        const fy = dy * force
        
        adjusted[id1] = { x: p1.x - fx, y: p1.y - fy }
        adjusted[id2] = { x: p2.x + fx, y: p2.y + fy }
      }
    }
  }
  
  return adjusted
}

/**
 * Layout base + posiciones arrastradas (ratios 0–1) con mejor distribución.
 */
export function mergeLayoutWithOverrides(
  nodes,
  width,
  height,
  overrides,
  startId,
  endId,
) {
  const base = computeBaseLayout(nodes, width, height, startId, endId)
  if (!overrides || typeof overrides !== 'object') return base

  const ids = new Set(nodes.map((n) => n.id))
  const out = { ...base }
  
  // Aplicar posiciones arrastradas
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
  
  // Aplicar fuerzas de repulsión para mejorar distribución
  const withRepulsion = applyRepulsionForces(out)
  
  // Asegurar que los nodos permanezcan dentro de los límites del canvas
  const margin = 40
  for (const id of ids) {
    const pos = withRepulsion[id]
    pos.x = Math.max(margin, Math.min(width - margin, pos.x))
    pos.y = Math.max(margin, Math.min(height - margin, pos.y))
  }
  
  return withRepulsion
}
