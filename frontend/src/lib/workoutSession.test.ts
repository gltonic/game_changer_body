import { describe, it, expect, vi } from 'vitest'
import { createWorkoutSessionManager } from './workoutSession'
import type { WorkoutSessionPlan } from './progression'

describe('Workout Session & Rest Timer Manager', () => {
  const mockPlan: WorkoutSessionPlan = {
    workoutIndex: 1,
    discipline: 'pullups',
    sets: [6, 5, 5, 4, 3],
    unit: 'reps',
    restSeconds: 120,
    visualGrade: 'stone'
  }

  it('initializes session in idle state at set 0', () => {
    const session = createWorkoutSessionManager(mockPlan)
    const state = session.getState()

    expect(state.status).toBe('idle')
    expect(state.currentSetIndex).toBe(0)
    expect(state.completedSets).toEqual([])
    expect(state.remainingRest).toBe(120)
  })

  it('starts workout and transitions to in_set', () => {
    const session = createWorkoutSessionManager(mockPlan)
    session.startWorkout()

    expect(session.getState().status).toBe('in_set')
    expect(session.getState().currentSetIndex).toBe(0)
  })

  it('completes current set and transitions to resting with 120s timer', () => {
    const session = createWorkoutSessionManager(mockPlan)
    session.startWorkout()
    session.completeCurrentSet()

    const state = session.getState()
    expect(state.status).toBe('resting')
    expect(state.completedSets).toEqual([6])
    expect(state.remainingRest).toBe(120)
  })

  it('allows adding +30 seconds of rest', () => {
    const session = createWorkoutSessionManager(mockPlan)
    session.startWorkout()
    session.completeCurrentSet()
    session.addRestTime(30)

    expect(session.getState().remainingRest).toBe(150)
  })

  it('decrements timer on tick and triggers onRestComplete when reaching 0', () => {
    const onRestComplete = vi.fn()
    const session = createWorkoutSessionManager(mockPlan, { onRestComplete })
    session.startWorkout()
    session.completeCurrentSet()

    session.setRemainingRest(1)
    session.tickRest()

    expect(session.getState().remainingRest).toBe(0)
    expect(onRestComplete).toHaveBeenCalledTimes(1)
    expect(session.getState().status).toBe('in_set')
    expect(session.getState().currentSetIndex).toBe(1)
  })

  it('skips rest and advances to next set immediately', () => {
    const session = createWorkoutSessionManager(mockPlan)
    session.startWorkout()
    session.completeCurrentSet()
    session.skipRest()

    const state = session.getState()
    expect(state.status).toBe('in_set')
    expect(state.currentSetIndex).toBe(1)
  })

  it('completes all 5 sets and marks session as completed', () => {
    const onWorkoutComplete = vi.fn()
    const session = createWorkoutSessionManager(mockPlan, { onWorkoutComplete })
    session.startWorkout()

    // Complete sets 0, 1, 2, 3 (skipping rests)
    for (let i = 0; i < 4; i++) {
      session.completeCurrentSet()
      session.skipRest()
    }

    expect(session.getState().currentSetIndex).toBe(4)

    // Complete 5th and final set
    session.completeCurrentSet()

    const state = session.getState()
    expect(state.status).toBe('completed')
    expect(state.completedSets).toEqual([6, 5, 5, 4, 3])
    expect(onWorkoutComplete).toHaveBeenCalledWith([6, 5, 5, 4, 3])
  })

  it('syncWithCurrentTime accurately jumps forward when phone woke up after 40 seconds of rest', () => {
    const session = createWorkoutSessionManager(mockPlan)
    session.startWorkout()
    session.completeCurrentSet()

    expect(session.getState().remainingRest).toBe(120)

    // Simulate 40 seconds passing in background
    const startTime = Date.now()
    session.syncWithCurrentTime(startTime + 40000)

    expect(session.getState().remainingRest).toBe(80)
    expect(session.getState().status).toBe('resting')
  })

  it('syncWithCurrentTime completes rest when sleep duration exceeds remaining rest', () => {
    const onRestComplete = vi.fn()
    const session = createWorkoutSessionManager(mockPlan, { onRestComplete })
    session.startWorkout()
    session.completeCurrentSet()

    // 130s sleep when rest is 120s
    const startTime = Date.now()
    session.syncWithCurrentTime(startTime + 130000)

    expect(session.getState().status).toBe('in_set')
    expect(session.getState().currentSetIndex).toBe(1)
    expect(session.getState().remainingRest).toBe(0)
    expect(onRestComplete).toHaveBeenCalledTimes(1)
  })

  it('triggers onCountdownPip when rest has 3, 2, 1 seconds left', () => {
    const onCountdownPip = vi.fn()
    const session = createWorkoutSessionManager(mockPlan, { onCountdownPip })
    session.startWorkout()
    session.completeCurrentSet()

    session.setRemainingRest(4)
    session.tickRest() // remaining becomes 3
    expect(onCountdownPip).toHaveBeenCalledWith(3)

    session.tickRest() // remaining becomes 2
    expect(onCountdownPip).toHaveBeenCalledWith(2)

    session.tickRest() // remaining becomes 1
    expect(onCountdownPip).toHaveBeenCalledWith(1)
  })

  it('restores state from saved session and syncs time elapsed since closure', () => {
    const savedTime = Date.now() - 30000 // closed 30s ago
    const savedState = {
      status: 'resting' as const,
      currentSetIndex: 0,
      completedSets: [6],
      remainingRest: 90,
      isRestPaused: false,
      totalSets: 5,
      activeSetSeconds: 0,
      isSetPaused: false,
      currentSetTarget: 5,
      currentSetActual: 5,
      savedAt: savedTime
    }

    const session = createWorkoutSessionManager(mockPlan, undefined, savedState)
    session.syncWithCurrentTime(savedTime + 30000)

    // 90s - 30s = 60s remaining
    expect(session.getState().remainingRest).toBe(60)
    expect(session.getState().completedSets).toEqual([6])
    expect(session.getState().status).toBe('resting')
  })
})


