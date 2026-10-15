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
})
