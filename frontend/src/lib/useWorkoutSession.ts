import { useState, useEffect, useMemo, useRef } from 'react'
import {
  createWorkoutSessionManager,
  type WorkoutSessionState,
  type WorkoutSessionCallbacks
} from './workoutSession'
import type { WorkoutSessionPlan } from './progression'

export function playBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime) // A5 note
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.4)
  } catch (e) {
    // Audio context may be restricted by browser until first interaction
  }
}

export function triggerVibration(pattern: number | number[] = [200, 100, 200]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern)
    } catch (e) {
      // Ignore vibration error
    }
  }
}

export function useWorkoutSession(
  plan: WorkoutSessionPlan,
  callbacks?: WorkoutSessionCallbacks
) {
  const callbacksRef = useRef<WorkoutSessionCallbacks | undefined>(callbacks)
  callbacksRef.current = callbacks

  // Stable key: ONLY re-create manager if switching to a different workout session
  const planKey = `${plan.discipline}-${plan.workoutIndex}`

  const manager = useMemo(() => {
    return createWorkoutSessionManager(plan, {
      onRestComplete: () => {
        playBeep()
        triggerVibration([300, 150, 300])
        callbacksRef.current?.onRestComplete?.()
      },
      onSetTimerComplete: () => {
        playBeep()
        triggerVibration([200, 100, 200])
        callbacksRef.current?.onSetTimerComplete?.()
      },
      onWorkoutComplete: (completedSets) => {
        callbacksRef.current?.onWorkoutComplete?.(completedSets)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planKey])

  const [state, setState] = useState<WorkoutSessionState>(() => manager.getState())

  useEffect(() => {
    setState(manager.getState())
    return manager.subscribe((newState) => {
      setState(newState)
    })
  }, [manager])

  // Timer interval for in-set timer and rest period
  useEffect(() => {
    if (state.status !== 'resting' && state.status !== 'in_set') return
    if (state.status === 'resting' && state.isRestPaused) return
    if (state.status === 'in_set' && state.isSetPaused) return

    const timer = setInterval(() => {
      if (state.status === 'resting') {
        manager.tickRest()
      } else if (state.status === 'in_set') {
        manager.tickSetTimer()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [manager, state.status, state.isRestPaused, state.isSetPaused])

  return {
    ...state,
    startWorkout: manager.startWorkout,
    completeCurrentSet: manager.completeCurrentSet,
    addRestTime: manager.addRestTime,
    setRemainingRest: manager.setRemainingRest,
    skipRest: manager.skipRest,
    togglePauseRest: manager.togglePauseRest,
    togglePauseSetTimer: manager.togglePauseSetTimer,
    addSetTime: manager.addSetTime,
    setActualCount: manager.setActualCount,
    adjustActualCount: manager.adjustActualCount
  }
}
