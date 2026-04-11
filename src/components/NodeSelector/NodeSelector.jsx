/**
 * Selectores de nodo inicio y destino enlazados al grafo actual del store.
 */

import { useStore } from '../../store/useStore.js'
import './NodeSelector.css'

export function NodeSelector() {
  const graph = useStore((s) => s.graph)
  const startNode = useStore((s) => s.startNode)
  const endNode = useStore((s) => s.endNode)
  const setStartNode = useStore((s) => s.setStartNode)
  const setEndNode = useStore((s) => s.setEndNode)

  const ids = graph.nodes.map((n) => n.id).sort()

  const handleStartNodeChange = (value) => {
    if (value && value === endNode) {
      // Si el nuevo inicio es igual al destino actual, limpiar el destino
      setEndNode('')
    }
    setStartNode(value)
  }

  const handleEndNodeChange = (value) => {
    if (value && value === startNode) {
      // Si el nuevo destino es igual al inicio actual, limpiar el inicio
      setStartNode('')
    }
    setEndNode(value)
  }

  // Filtrar opciones para excluir el nodo ya seleccionado
  const startNodeOptions = ids.filter(id => id !== endNode)
  const endNodeOptions = ids.filter(id => id !== startNode)

  return (
    <div className="node-selector">
      <label className="node-selector__field">
        <span className="node-selector__label">Nodo inicio</span>
        <select
          value={startNode}
          onChange={(e) => handleStartNodeChange(e.target.value)}
          disabled={!ids.length}
        >
          <option value="">-</option>
          {startNodeOptions.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>
      <label className="node-selector__field">
        <span className="node-selector__label">Nodo destino</span>
        <select
          value={endNode}
          onChange={(e) => handleEndNodeChange(e.target.value)}
          disabled={!ids.length}
        >
          <option value="">-</option>
          {endNodeOptions.map((id) => (
            <option key={`e-${id}`} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
