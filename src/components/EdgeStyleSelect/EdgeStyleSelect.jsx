/**
 * Selector del estilo de dibujo de las aristas (rectas, curvas, escalón).
 */

import { useStore } from '../../store/useStore.js'
import './EdgeStyleSelect.css'

const MODES = [
  { value: 'straight', label: 'Rectas' },
  { value: 'curved', label: 'Curvas' },
  { value: 'step', label: 'Escalón' },
]

export function EdgeStyleSelect() {
  const mode = useStore((s) => s.edgeRenderMode)
  const setEdgeRenderMode = useStore((s) => s.setEdgeRenderMode)

  return (
    <label className="edge-style-select">
      <span className="edge-style-select__label">Aristas</span>
      <select
        value={mode}
        onChange={(e) => setEdgeRenderMode(e.target.value)}
        aria-label="Estilo de aristas del grafo"
      >
        {MODES.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
    </label>
  )
}
