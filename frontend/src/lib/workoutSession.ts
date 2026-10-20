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
  onCountdownPip?: (secondsLeft: number) => void
}

export interface WorkoutSessionManager {
  getState: () => WorkoutSessionState
  startWorkout: () => void
  completeCurrentSet: (countOverride?: number) => void
  addRestTime: (seconds: number) => void
  setRemainingRest: (seconds: number) => void
  tickRest: (now?: number) => void
  syncWithCurrentTime: (now?: number) => void
  skipRest: () => void
  togglePauseRest: () => void
  tickSetTimer: (now?: number) => void
  togglePauseSetTimer: () => void
  addSetTime: (seconds: number) => void
  setActualCount: (count: number) => void
  adjustActualCount: (delta: number) => void
  subscribe: (listener: (state: WorkoutSessionState) => void) => () => void
}

export function createWorkoutSessionManager(
  plan: WorkoutSessionPlan,
  callbacks?: WorkoutSessionCallbacks,
  initialState?: (Partial<WorkoutSessionState> & { savedAt?: number }) | null
): WorkoutSessionManager {
  const isTimeBased = plan.unit === 'seconds'
  const initialIndex = initialState?.currentSetIndex ?? 0
  const currentTarget = plan.sets[initialIndex] || 0

  let lastRestTickAt: number = initialState?.savedAt ?? Date.now()
  let lastSetTickAt: number = initialState?.savedAt ?? Date.now()

  let state: WorkoutSessionState = {
    status: initialState?.status || 'idle',
    currentSetIndex: initialIndex,
    completedSets: initialState?.completedSets ?? [],
    remainingRest: initialState?.remainingRest ?? (plan.restSeconds || 120),
    isRestPaused: initialState?.isRestPaused ?? false,
    totalSets: plan.sets.length,
    activeSetSeconds: initialState?.activeSetSeconds ?? (isTimeBased ? currentTarget : 0),
    isSetPaused: initialState?.isSetPaused ?? false,
    currentSetTarget: initialState?.currentSetTarget ?? currentTarget,
    currentSetActual: initialState?.currentSetActual ?? currentTarget
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
    lastSetTickAt = Date.now()
  }

  return {
    getState: () => ({ ...state }),

    startWorkout: () => {
      state.status = 'in_set'
      initSet(0)
      notify()
    },

    syncWithCurrentTime: (now: number = Date.now()) => {
      if (state.status === 'resting' && !state.isRestPaused) {
        const elapsedMs = Math.max(0, now - lastRestTickAt)
        const deltaSec = Math.floor(elapsedMs / 1000)
        if (deltaSec >= 1) {
          lastRestTickAt = now
          if (state.remainingRest > deltaSec) {
            state.remainingRest -= deltaSec
            if (state.remainingRest <= 3) {
              callbacks?.onCountdownPip?.(state.remainingRest)
            }
            notify()
          } else {
            state.remainingRest = 0
            state.status = 'in_set'
            initSet(state.currentSetIndex + 1)
            notify()
            callbacks?.onRestComplete?.()
          }
        }
      } else if (state.status === 'in_set' && !state.isSetPaused) {
        const elapsedMs = Math.max(0, now - lastSetTickAt)
        const deltaSec = Math.floor(elapsedMs / 1000)
        if (deltaSec >= 1) {
          lastSetTickAt = now
          if (isTimeBased) {
            if (state.activeSetSeconds > deltaSec) {
              state.activeSetSeconds -= deltaSec
              notify()
            } else {
              state.activeSetSeconds = 0
              notify()
              callbacks?.onSetTimerComplete?.()
            }
          } else {
            state.activeSetSeconds += deltaSec
            notify()
          }
        }
      }
    },

    tickSetTimer: (now: number = Date.now()) => {
      if (state.status !== 'in_set' || state.isSetPaused) return

      const elapsedMs = Math.max(0, now - lastSetTickAt)
      const deltaSec = elapsedMs >= 1500 ? Math.floor(elapsedMs / 1000) : 1
      lastSetTickAt = now

      if (isTimeBased) {
        if (state.activeSetSeconds > deltaSec) {
          state.activeSetSeconds -= deltaSec
          notify()
        } else {
          state.activeSetSeconds = 0
          notify()
          callbacks?.onSetTimerComplete?.()
        }
      } else {
        // Stopwatch for reps
        state.activeSetSeconds += deltaSec
        notify()
      }
    },

    togglePauseSetTimer: () => {
      if (state.status !== 'in_set') return
      state.isSetPaused = !state.isSetPaused
      lastSetTickAt = Date.now()
      notify()
    },

    addSetTime: (seconds: number) => {
      if (state.status !== 'in_set') return
      state.activeSetSeconds += seconds
      state.currentSetActual = Math.max(state.currentSetActual, state.activeSetSeconds)
      lastSetTickAt = Date.now()
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
        lastRestTickAt = Date.now()
        notify()
      }
    },

    addRestTime: (seconds: number) => {
      if (state.status !== 'resting') return
      state.remainingRest += seconds
      lastRestTickAt = Date.now()
      notify()
    },

    setRemainingRest: (seconds: number) => {
      state.remainingRest = Math.max(0, seconds)
      lastRestTickAt = Date.now()
      notify()
    },

    tickRest: (now: number = Date.now()) => {
      if (state.status !== 'resting' || state.isRestPaused) return

      const elapsedMs = Math.max(0, now - lastRestTickAt)
      const deltaSec = elapsedMs >= 1500 ? Math.floor(elapsedMs / 1000) : 1
      lastRestTickAt = now

      if (state.remainingRest > deltaSec) {
        state.remainingRest -= deltaSec
        if (state.remainingRest <= 3) {
          callbacks?.onCountdownPip?.(state.remainingRest)
        }
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
      lastRestTickAt = Date.now()
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
