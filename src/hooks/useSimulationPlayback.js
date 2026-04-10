/**
 * Hook que reproduce la simulación paso a paso con setInterval cuando `isPlaying` es true.
 * No contiene lógica del algoritmo: solo avanza `currentStep` vía acciones del store.
 */

import { useEffect } from 'react'
import { useStore } from '../store/useStore.js'

/** Intervalo entre pasos en reproducción automática (más lento = más fácil de seguir). */
const STEP_MS = 1600

/**
 * Sincroniza la reproducción automática con el estado global.
 */
export function useSimulationPlayback() {
  const isPlaying = useStore((s) => s.isPlaying)
  const stepsLength = useStore((s) => s.steps.length)

  useEffect(() => {
    if (!isPlaying || stepsLength === 0) return undefined

    const tick = () => {
      const { currentStep, steps, nextStep, setIsPlaying } =
        useStore.getState()
      if (!steps.length) {
        setIsPlaying(false)
        return
      }
      if (currentStep >= steps.length - 1) {
        setIsPlaying(false)
        return
      }
      nextStep()
    }

    const id = window.setInterval(tick, STEP_MS)
    return () => window.clearInterval(id)
  }, [isPlaying, stepsLength])
}
