/**
 * Controles de simulación flotantes sobre el grafo.
 */

import { useStore } from '../../store/useStore.js'
import './SimControls.css'

/**
 * @param {{ onRunMessage: (msg: string | null) => void }} props
 */
export function SimControls({ onRunMessage }) {
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
    if (!out.success) {
      onRunMessage(out.message)
      return
    }
    onRunMessage(null)
  }

  const handlePlay = () => { if (canStep) setIsPlaying(true) }
  const handlePause = () => setIsPlaying(false)
  const handleNext = () => { if (canStep) nextStep() }
  const handlePrevious = () => { if (canPrev) previousStep() }
  const handleReset = () => { setIsPlaying(false); reset() }

  const totalSteps = steps.length
  const displayStep = !hasSteps || currentStep < 0 ? '—' : String(currentStep + 1)

  const currentStepData = hasSteps && currentStep >= 0 ? steps[currentStep] : null
  const isLastStep = hasSteps && currentStep === steps.length - 1

  return (
    <div className="sim-toolbar-wrap">
      {currentStepData && (
        <div className="sim-step-desc" aria-live="polite">
          {isLastStep
            ? 'Algoritmo completado. Todos los caminos mínimos calculados.'
            : currentStepData.description}
        </div>
      )}
      <div className="sim-toolbar" role="toolbar" aria-label="Controles de simulación">
        <button
          type="button"
          className="sim-toolbar__primary"
          onClick={handleCalculate}
        >
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
  )
}
