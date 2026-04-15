/**
 * Controles de simulación flotantes sobre el grafo.
 */

import { useStore } from '../../store/useStore.js'
import './SimControls.css'

const LEGEND_ITEMS_SIMULATION = [
  { color: '#185FA5', label: 'Nodo actual' },
  { color: '#639922', label: 'Visitado' },
  { color: '#F59E0B', label: 'Próximo a visitar' },
  { color: '#BA7517', label: 'Inicio / Fin' },
  { color: '#888780', label: 'Sin visitar' },
  { color: '#C62828', label: 'Arista seleccionada', isEdge: true },
  { color: '#E8A317', label: 'Aristas a evaluar', isEdge: true },
]

const LEGEND_ITEMS_PATH = [
  { color: '#D85A30', label: 'Camino mínimo', isEdge: true },
  { color: '#D85A30', label: 'Nodo en camino' },
]

/**
 * @param {{ onRunMessage: (msg: string | null) => void }} props
 */
export function SimControls({ onRunMessage, chatOpen = false }) {
  const steps = useStore((s) => s.steps)
  const currentStep = useStore((s) => s.currentStep)
  const isPlaying = useStore((s) => s.isPlaying)
  const runDijkstra = useStore((s) => s.runDijkstra)
  const nextStep = useStore((s) => s.nextStep)
  const previousStep = useStore((s) => s.previousStep)
  const reset = useStore((s) => s.reset)
  const setIsPlaying = useStore((s) => s.setIsPlaying)

  const hasSteps = steps.length > 0
  const atLast = hasSteps && currentStep >= steps.length - 1
  const canStep = hasSteps && !atLast
  const canPrev = hasSteps && currentStep >= 0 && !isPlaying

  const handleCalculate = () => {
    const out = runDijkstra()
    if (!out.success) { onRunMessage(out.message); return }
    onRunMessage(null)
  }

  const handlePlay = () => { if (canStep) setIsPlaying(true) }
  const handlePause = () => setIsPlaying(false)
  const handleNext = () => { if (canStep) nextStep() }
  const handlePrevious = () => { if (canPrev) previousStep() }
  const handleReset = () => { setIsPlaying(false); reset() }

  const totalSteps = steps.length
  const displayStep = !hasSteps || currentStep < 0 ? '—' : String(currentStep + 1)
  const progressPct = totalSteps > 0 && currentStep >= 0
    ? Math.round(((currentStep + 1) / totalSteps) * 100)
    : 0

  const currentStepData = hasSteps && currentStep >= 0 ? steps[currentStep] : null
  const isLastStep = hasSteps && currentStep === steps.length - 1

  const visitedCount = currentStepData?.visited?.length ?? 0
  const totalNodes = hasSteps ? steps[steps.length - 1]?.visited?.length ?? 0 : 0

  return (
    <>
      {/* Leyenda — esquina superior derecha del canvas */}
      {hasSteps && !chatOpen && (
        <div className="sim-legend" aria-label="Leyenda de colores">
          {(isLastStep ? LEGEND_ITEMS_PATH : LEGEND_ITEMS_SIMULATION).map((item) => (
            <div key={item.label} className="sim-legend__item">
              {item.isEdge ? (
                <span className="sim-legend__edge" style={{ background: item.color }} />
              ) : (
                <span className="sim-legend__dot" style={{ background: item.color }} />
              )}
              <span className="sim-legend__label">{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar + chip + barra de progreso */}
      <div className="sim-toolbar-wrap">
        {currentStepData && (
          <div className="sim-step-desc" aria-live="polite">
            <div className="sim-step-desc__text">
              {isLastStep
                ? 'Algoritmo completado. Todos los caminos mínimos calculados.'
                : currentStepData.description}
            </div>
          </div>
        )}

        <div className="sim-toolbar" role="toolbar" aria-label="Controles de simulación">
          <button type="button" className="sim-toolbar__primary" onClick={handleCalculate}>
            Calcular ruta
          </button>

          <span className="sim-toolbar__divider" aria-hidden="true" />

          <div className="sim-toolbar__transport">
            <button type="button" className="sim-toolbar__btn" onClick={handlePlay}
              disabled={!canStep || isPlaying} title="Reproducir" aria-label="Reproducir">▶</button>
            <button type="button" className="sim-toolbar__btn" onClick={handlePause}
              disabled={!isPlaying} title="Pausar" aria-label="Pausar">⏸</button>
            <button type="button" className="sim-toolbar__btn" onClick={handlePrevious}
              disabled={!canPrev} title="Paso anterior" aria-label="Paso anterior">⏮</button>
            <button type="button" className="sim-toolbar__btn" onClick={handleNext}
              disabled={!canStep || isPlaying} title="Siguiente paso" aria-label="Siguiente paso">⏭</button>
            <button type="button" className="sim-toolbar__btn sim-toolbar__btn--ghost" onClick={handleReset}
              disabled={!hasSteps} title="Reiniciar" aria-label="Reiniciar">↺</button>
          </div>

          <span className="sim-toolbar__divider sim-toolbar__divider--short" aria-hidden="true" />

          <div className="sim-toolbar__badge" aria-live="polite">
            <span className="sim-toolbar__badge-label">Paso</span>
            <span className="sim-toolbar__badge-value">
              {displayStep}
              <span className="sim-toolbar__badge-total"> / {totalSteps || '—'}</span>
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
