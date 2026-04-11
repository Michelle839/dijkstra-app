/**
 * Panel izquierdo: historial tipo chat y entrada de aristas; dispara acciones del store.
 */

import { useCallback, useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { splitEdgeLines } from '../../utils/parseInput.js'
import { validateEdgeInput } from '../../utils/validators.js'
import { EXAMPLE_EDGE_LINES } from '../../constants/exampleGraph.js'
import { ChatHistory } from './ChatHistory.jsx'
import { EdgeInput } from './EdgeInput.jsx'
import './ChatPanel.css'

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function ChatPanel() {
  const [messages, setMessages] = useState([])
  const [line, setLine] = useState('')
  const [isCollapsed, setIsCollapsed] = useState(false)

  const clearGraph = useStore((s) => s.clearGraph)

  const pushMessage = useCallback((role, text) => {
    setMessages((prev) => [...prev, { id: uid(), role, text }])
  }, [])

  const handleAdd = useCallback(() => {
    const lines = splitEdgeLines(line)
    if (lines.length === 0) {
      pushMessage('error', 'La entrada está vacía.')
      return
    }

    const added = []
    const warnings = []
    const errors = []

    lines.forEach((raw, index) => {
      const lineNum = index + 1
      const { graph: g, addEdge: ae } = useStore.getState()
      const result = validateEdgeInput(raw, g.edges)
      if (!result.ok) {
        const prefix = `Línea ${lineNum} ("${raw}")`
        if (result.isDuplicate) {
          warnings.push(`${prefix}: ${result.message}`)
        } else {
          errors.push(`${prefix}: ${result.message}`)
        }
        return
      }
      const { from, to, weight } = result.parsed
      ae(from, to, weight)
      added.push(`${from} ${to} ${weight}`)
    })

    pushMessage('user', line.trim())
    if (added.length > 0) {
      const n = added.length
      pushMessage(
        'system',
        n === 1
          ? 'Listo: se añadió 1 conexión al grafo.'
          : `Listo: se añadieron ${n} conexiones al grafo.`,
      )
    }
    warnings.forEach((w) => pushMessage('warning', w))
    errors.forEach((e) => pushMessage('error', e))

    setLine('')
  }, [line, pushMessage])

  const handleLoadExample = useCallback(() => {
    clearGraph()
    EXAMPLE_EDGE_LINES.forEach((l) => {
      const { graph: g, addEdge: ae } = useStore.getState()
      const r = validateEdgeInput(l, g.edges)
      if (r.ok) {
        ae(r.parsed.from, r.parsed.to, r.parsed.weight)
      }
    })
    setMessages([
      { id: uid(), role: 'system', text: 'Grafo de ejemplo cargado.' },
    ])
  }, [clearGraph])

  const handleClear = useCallback(() => {
    clearGraph()
    setMessages([
      {
        id: uid(),
        role: 'system',
        text: 'Grafo e historial vaciados.',
      },
    ])
  }, [clearGraph])

  return (
    <aside 
      className={`chat-card ${isCollapsed ? 'chat-card--collapsed' : ''}`} 
      aria-label="Asistente para añadir aristas"
    >
      <header className="chat-card__header">
        <button 
          type="button" 
          className="chat-card__toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Expandir chat' : 'Colapsar chat'}
        >
          {isCollapsed ? '»' : '«'}
        </button>
        {!isCollapsed && (
          <div className="chat-card__headlines">
            <h2 className="chat-card__title">Asistente de aristas</h2>
            <p className="chat-card__hint">
              Una línea por arista: <code>origen destino peso</code>. Puedes pegar
              varias líneas.
            </p>
          </div>
        )}
      </header>
      {!isCollapsed && (
        <>
          <ChatHistory messages={messages} />
          <div className="chat-card__footer">
            <EdgeInput
              value={line}
              onChange={setLine}
              onSubmit={handleAdd}
            />
            <div className="chat-card__actions">
              <button type="button" onClick={handleLoadExample}>
                Cargar ejemplo
              </button>
              <button type="button" onClick={handleClear} className="btn-muted">
                Limpiar
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  )
}
