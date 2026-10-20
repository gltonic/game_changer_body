import { useState, useEffect, useMemo, useRef } from 'react'
import {
  createWorkoutSessionManager,
  type WorkoutSessionState,
  type WorkoutSessionCallbacks
} from './workoutSession'
import type { WorkoutSessionPlan } from './progression'
import {
  unlockAudio,
  playRestCompleteChime,
  playCountdownPip,
  playSetCompleteChime,
  triggerVibration
} from './soundAlerts'

export { unlockAudio, triggerVibration }

// Exported for backward compatibility
export function playBeep() {
  playRestCompleteChime()
}

export function useWorkoutSession(
  plan: WorkoutSessionPlan,
  callbacks?: WorkoutSessionCallbacks
) {
  const callbacksRef = useRef<WorkoutSessionCallbacks | undefined>(callbacks)
  callbacksRef.current = callbacks

  // Stable key: ONLY re-create manager if switching to a different workout session
  const planKey = `${plan.discipline}-${plan.workoutIndex}`
  const storageKey = `gc_workout_state_${planKey}`

  const manager = useMemo(() => {
    let savedState: any = null
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        savedState = JSON.parse(raw)
      }
    } catch {
      // Ignore parse error
    }

    const m = createWorkoutSessionManager(
      plan,
      {
        onRestComplete: () => {
          playRestCompleteChime()
          callbacksRef.current?.onRestComplete?.()
        },
        onSetTimerComplete: () => {
          playSetCompleteChime()
          callbacksRef.current?.onSetTimerComplete?.()
        },
        onCountdownPip: (secondsLeft) => {
          playCountdownPip()
          callbacksRef.current?.onCountdownPip?.(secondsLeft)
        },
        onWorkoutComplete: (completedSets) => {
          try {
            localStorage.removeItem(storageKey)
          } catch {}
          callbacksRef.current?.onWorkoutComplete?.(completedSets)
        }
      },
      savedState
    )

    // If restored from storage while resting or in set, catch up to current wall-clock time
    if (savedState && (savedState.status === 'resting' || savedState.status === 'in_set')) {
      m.syncWithCurrentTime()
    }

    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planKey, storageKey])

  const [state, setState] = useState<WorkoutSessionState>(() => manager.getState())

  useEffect(() => {
    setState(manager.getState())
    return manager.subscribe((newState) => {
      setState(newState)
      try {
        if (newState.status === 'completed') {
          localStorage.removeItem(storageKey)
        } else if (newState.status !== 'idle') {
          localStorage.setItem(storageKey, JSON.stringify({ ...newState, savedAt: Date.now() }))
        }
      } catch {
        // Ignore localStorage quota errors
      }
    })
  }, [manager, storageKey])

  // Synchronize timers when returning from background / phone unlock
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        manager.syncWithCurrentTime()
      }
    }
    const handleFocus = () => {
      manager.syncWithCurrentTime()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
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

  const startWorkout = () => {
    unlockAudio()
    manager.startWorkout()
  }

  const completeCurrentSet = (countOverride?: number) => {
    unlockAudio()
    manager.completeCurrentSet(countOverride)
  }

  const addRestTime = (seconds: number) => {
    unlockAudio()
    manager.addRestTime(seconds)
  }

  const setRemainingRest = (seconds: number) => {
    unlockAudio()
    manager.setRemainingRest(seconds)
  }

  const skipRest = () => {
    unlockAudio()
    manager.skipRest()
  }

  const togglePauseRest = () => {
    unlockAudio()
    manager.togglePauseRest()
  }

  const togglePauseSetTimer = () => {
    unlockAudio()
    manager.togglePauseSetTimer()
  }

  const addSetTime = (seconds: number) => {
    unlockAudio()
    manager.addSetTime(seconds)
  }

  const setActualCount = (count: number) => {
    unlockAudio()
    manager.setActualCount(count)
  }

  const adjustActualCount = (delta: number) => {
    unlockAudio()
    manager.adjustActualCount(delta)
  }

  return {
    ...state,
    startWorkout,
    completeCurrentSet,
    addRestTime,
    setRemainingRest,
    skipRest,
    togglePauseRest,
    togglePauseSetTimer,
    addSetTime,
    setActualCount,
    adjustActualCount,
    syncWithCurrentTime: manager.syncWithCurrentTime
  }
}
