/**
 * Lista de mensajes del panel tipo chat.
 */

import * as Framer from 'framer-motion'

function ResultCard({ data }) {
  return (
    <div className="result-card">
      <div className="result-card__header">
        <span className="result-card__title">
          {data.startNode} → {data.endNode}
        </span>
        {data.hasPath && (
          <span className="result-card__badge">{data.totalDistance}</span>
        )}
      </div>

      {data.hasPath ? (
        <div className="result-card__optimal">
          <span className="result-card__optimal-label">Ruta óptima</span>
          <span className="result-card__optimal-path">{data.finalPath}</span>
        </div>
      ) : (
        <p className="result-card__no-path">Sin ruta disponible</p>
      )}

      {data.paths.length > 0 && (
        <div className="result-card__section">
          <p className="result-card__section-title">Todos los caminos desde {data.startNode}</p>
          <div className="result-card__paths">
            {data.paths.map((p) => (
              <div key={p.nodeId} className="result-card__path-row">
                <span className="result-card__path-dest">{p.nodeId}</span>
                <span className="result-card__path-route">{p.path}</span>
                <span className="result-card__path-dist">{p.distance}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.unreachable?.length > 0 && (
        <p className="result-card__unreachable">
          Inalcanzables: {data.unreachable.join(', ')}
        </p>
      )}
    </div>
  )
}

/**
 * @param {{ messages: Array<{ id: string, role: string, text: any }> }} props
 */
export function ChatHistory({ messages }) {
  return (
    <div className="chat-history" role="log" aria-live="polite">
      <Framer.AnimatePresence initial={false}>
        {messages.map((m) => (
          <Framer.motion.div
            key={m.id}
            className={m.role !== 'result' ? `chat-bubble chat-bubble--${m.role}` : ''}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {m.role === 'result' ? <ResultCard data={m.text} /> : m.text}
          </Framer.motion.div>
        ))}
      </Framer.AnimatePresence>
    </div>
  )
}
