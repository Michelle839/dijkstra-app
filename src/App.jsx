/**
 * Vista principal: simulador a pantalla completa, chat flotante y controles sobre el grafo.
 */

import { useState } from 'react'
import { ChatPanel } from './components/ChatPanel/ChatPanel.jsx'
import { GraphCanvas } from './components/GraphCanvas/GraphCanvas.jsx'
import { NodeSelector } from './components/NodeSelector/NodeSelector.jsx'
import { SimControls } from './components/SimulationPanel/SimControls.jsx'
import { useSimulationPlayback } from './hooks/useSimulationPlayback.js'
import './App.css'

function App() {
  useSimulationPlayback()
  const [runError, setRunError] = useState(null)

  return (
    <div className="app">
      <div className="simulator">
        <header className="simulator__header">
          <div className="simulator__brand">
            <span className="simulator__mark" aria-hidden="true" />
            <div>
              <h1 className="simulator__title">Dijkstra</h1>
              <p className="simulator__subtitle">Camino mínimo en el grafo</p>
            </div>
          </div>
          <NodeSelector />
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
          <GraphCanvas />
          <SimControls onRunMessage={setRunError} />
        </div>

        <ChatPanel />
      </div>
    </div>
  )
}

export default App
