/**
 * Vista principal: simulador a pantalla completa, chat en sidebar y controles sobre el grafo.
 */

import { useState } from 'react'
import { ChatPanel } from './components/ChatPanel/ChatPanel.jsx'
import { GraphCanvas } from './components/GraphCanvas/GraphCanvas.jsx'
import { EdgeStyleSelect } from './components/EdgeStyleSelect/EdgeStyleSelect.jsx'
import { NodeSelector } from './components/NodeSelector/NodeSelector.jsx'
import { SimControls } from './components/SimulationPanel/SimControls.jsx'
import { useSimulationPlayback } from './hooks/useSimulationPlayback.js'
import './App.css'

function App() {
  useSimulationPlayback()
  const [runError, setRunError] = useState(null)
  const [chatOpen, setChatOpen] = useState(true)

  return (
    <div className="app">
      <div className="simulator">
        <header className="simulator__header">
          <div className="simulator__brand">
            <button
              type="button"
              className="chat-fab"
              onClick={() => setChatOpen((v) => !v)}
              aria-label={chatOpen ? 'Ocultar panel' : 'Mostrar panel'}
              title={chatOpen ? 'Ocultar panel' : 'Mostrar panel'}
            >
              {chatOpen ? '✕' : '☰'}
            </button>
            <div>
              <h1 className="simulator__title">Dijkstra</h1>
              <p className="simulator__subtitle">Camino mínimo en el grafo</p>
            </div>
          </div>
          <div className="simulator__header-controls">
            <NodeSelector />
            <EdgeStyleSelect />
          </div>
        </header>

        {runError && (
          <div className="simulator__alert" role="alert">
            <span>{runError}</span>
            <button
              type="button"
              className="simulator__alert-close"
              aria-label="Cerrar aviso"
              onClick={() => setRunError(null)}
            >
              ×
            </button>
          </div>
        )}

        <div className="simulator__stage">
          {chatOpen && <ChatPanel />}
          <div className="simulator__canvas-wrap">
            <GraphCanvas />
            <SimControls onRunMessage={setRunError} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
