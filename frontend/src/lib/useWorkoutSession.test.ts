import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWorkoutSession } from './useWorkoutSession'
import type { WorkoutSessionPlan } from './progression'

describe('useWorkoutSession React Hook', () => {
  const mockPlan: WorkoutSessionPlan = {
    workoutIndex: 1,
    discipline: 'pushups',
    sets: [10, 8, 8, 6, 6],
    unit: 'reps',
    restSeconds: 120,
    visualGrade: 'stone'
  }

  it('manages workout lifecycle in React component', () => {
    const { result } = renderHook(() => useWorkoutSession(mockPlan))

    expect(result.current.status).toBe('idle')
    expect(result.current.currentSetIndex).toBe(0)

    // Start workout
    act(() => {
      result.current.startWorkout()
    })
    expect(result.current.status).toBe('in_set')

    // Complete first set
    act(() => {
      result.current.completeCurrentSet()
    })
    expect(result.current.status).toBe('resting')
    expect(result.current.remainingRest).toBe(120)

    // Add 30 seconds
    act(() => {
      result.current.addRestTime(30)
    })
    expect(result.current.remainingRest).toBe(150)

    // Skip rest
    act(() => {
      result.current.skipRest()
    })
    expect(result.current.status).toBe('in_set')
    expect(result.current.currentSetIndex).toBe(1)
  })
})
