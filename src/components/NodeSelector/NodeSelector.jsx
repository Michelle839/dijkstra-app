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

  return (
    <div className="node-selector">
      <label className="node-selector__field">
        <span className="node-selector__label">Nodo inicio</span>
        <select
          value={startNode}
          onChange={(e) => setStartNode(e.target.value)}
          disabled={!ids.length}
        >
          <option value="">—</option>
          {ids.map((id) => (
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
          onChange={(e) => setEndNode(e.target.value)}
          disabled={!ids.length}
        >
          <option value="">—</option>
          {ids.map((id) => (
            <option key={`e-${id}`} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
