import type { WorkoutSessionPlan } from './progression'

export type WorkoutSessionStatus = 'idle' | 'in_set' | 'resting' | 'completed'

export interface WorkoutSessionState {
  status: WorkoutSessionStatus
  currentSetIndex: number
  completedSets: number[]
  remainingRest: number
  isRestPaused: boolean
  totalSets: number
  activeSetSeconds: number
  isSetPaused: boolean
  currentSetTarget: number
  currentSetActual: number
}

export interface WorkoutSessionCallbacks {
  onRestComplete?: () => void
  onSetTimerComplete?: () => void
  onWorkoutComplete?: (completedSets: number[]) => void
}

export interface WorkoutSessionManager {
  getState: () => WorkoutSessionState
  startWorkout: () => void
  completeCurrentSet: (countOverride?: number) => void
  addRestTime: (seconds: number) => void
  setRemainingRest: (seconds: number) => void
  tickRest: () => void
  skipRest: () => void
  togglePauseRest: () => void
  tickSetTimer: () => void
  togglePauseSetTimer: () => void
  addSetTime: (seconds: number) => void
  setActualCount: (count: number) => void
  adjustActualCount: (delta: number) => void
  subscribe: (listener: (state: WorkoutSessionState) => void) => () => void
}

export function createWorkoutSessionManager(
  plan: WorkoutSessionPlan,
  callbacks?: WorkoutSessionCallbacks
): WorkoutSessionManager {
  const isTimeBased = plan.unit === 'seconds'
  const firstTarget = plan.sets[0] || 0

  let state: WorkoutSessionState = {
    status: 'idle',
    currentSetIndex: 0,
    completedSets: [],
    remainingRest: plan.restSeconds || 120,
    isRestPaused: false,
    totalSets: plan.sets.length,
    activeSetSeconds: isTimeBased ? firstTarget : 0,
    isSetPaused: false,
    currentSetTarget: firstTarget,
    currentSetActual: firstTarget
  }

  const listeners = new Set<(state: WorkoutSessionState) => void>()

  const notify = () => {
    listeners.forEach((listener) => listener({ ...state }))
  }

  const initSet = (index: number) => {
    const target = plan.sets[index] || 0
    state.currentSetIndex = index
    state.currentSetTarget = target
    state.currentSetActual = target
    state.activeSetSeconds = isTimeBased ? target : 0
    state.isSetPaused = false
  }

  return {
    getState: () => ({ ...state }),

    startWorkout: () => {
      state.status = 'in_set'
      initSet(0)
      notify()
    },

    tickSetTimer: () => {
      if (state.status !== 'in_set' || state.isSetPaused) return

      if (isTimeBased) {
        if (state.activeSetSeconds > 1) {
          state.activeSetSeconds -= 1
          notify()
        } else if (state.activeSetSeconds === 1) {
          state.activeSetSeconds = 0
          notify()
          callbacks?.onSetTimerComplete?.()
        }
      } else {
        // Stopwatch for reps
        state.activeSetSeconds += 1
        notify()
      }
    },

    togglePauseSetTimer: () => {
      if (state.status !== 'in_set') return
      state.isSetPaused = !state.isSetPaused
      notify()
    },

    addSetTime: (seconds: number) => {
      if (state.status !== 'in_set') return
      state.activeSetSeconds += seconds
      state.currentSetActual = Math.max(state.currentSetActual, state.activeSetSeconds)
      notify()
    },

    setActualCount: (count: number) => {
      state.currentSetActual = Math.max(0, count)
      notify()
    },

    adjustActualCount: (delta: number) => {
      state.currentSetActual = Math.max(0, state.currentSetActual + delta)
      notify()
    },

    completeCurrentSet: (countOverride?: number) => {
      if (state.status !== 'in_set') return

      const finalCount = countOverride !== undefined ? countOverride : state.currentSetActual
      state.completedSets = [...state.completedSets, finalCount]

      const isLastSet = state.currentSetIndex >= state.totalSets - 1

      if (isLastSet) {
        state.status = 'completed'
        notify()
        callbacks?.onWorkoutComplete?.(state.completedSets)
      } else {
        state.status = 'resting'
        state.remainingRest = plan.restSeconds || 120
        state.isRestPaused = false
        notify()
      }
    },

    addRestTime: (seconds: number) => {
      if (state.status !== 'resting') return
      state.remainingRest += seconds
      notify()
    },

    setRemainingRest: (seconds: number) => {
      state.remainingRest = Math.max(0, seconds)
      notify()
    },

    tickRest: () => {
      if (state.status !== 'resting' || state.isRestPaused) return

      if (state.remainingRest > 1) {
        state.remainingRest -= 1
        notify()
      } else {
        // Rest completed
        state.remainingRest = 0
        state.status = 'in_set'
        initSet(state.currentSetIndex + 1)
        notify()
        callbacks?.onRestComplete?.()
      }
    },

    skipRest: () => {
      if (state.status !== 'resting') return
      state.status = 'in_set'
      initSet(state.currentSetIndex + 1)
      state.remainingRest = 0
      notify()
    },

    togglePauseRest: () => {
      if (state.status !== 'resting') return
      state.isRestPaused = !state.isRestPaused
      notify()
    },

    subscribe: (listener: (state: WorkoutSessionState) => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }
  }
}
