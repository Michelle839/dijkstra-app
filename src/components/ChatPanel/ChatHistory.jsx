/**
 * Lista de mensajes del panel tipo chat (usuario vs sistema / errores).
 */

import * as Framer from 'framer-motion'

/**
 * @param {{ messages: Array<{ id: string, role: 'user' | 'system' | 'error' | 'warning', text: string }> }} props
 */
export function ChatHistory({ messages }) {
  return (
    <div className="chat-history" role="log" aria-live="polite">
      <Framer.AnimatePresence initial={false}>
        {messages.map((m) => (
          <Framer.motion.div
            key={m.id}
            className={`chat-bubble chat-bubble--${m.role}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {m.text}
          </Framer.motion.div>
        ))}
      </Framer.AnimatePresence>
    </div>
  )
}
