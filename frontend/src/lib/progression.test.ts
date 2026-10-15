import { describe, it, expect } from 'vitest'
import {
  calculateInitialTrail,
  applyDifficultyFeedback
} from './progression'

describe('Progression & Trail Generator Engine', () => {
  it('generates the exact requested number of workouts in the trail', () => {
    const workoutsCount = 25
    const baselineMax = 10
    const trail = calculateInitialTrail('pullups', baselineMax, workoutsCount)

    expect(trail).toHaveLength(workoutsCount)
    expect(trail[0].workoutIndex).toBe(1)
    expect(trail[workoutsCount - 1].workoutIndex).toBe(workoutsCount)
  })

  it('configures 5 sets per workout with progressive overload', () => {
    const trail = calculateInitialTrail('pullups', 10, 20)
    const firstWorkout = trail[0]
    const tenthWorkout = trail[9]

    expect(firstWorkout.sets).toHaveLength(5)
    expect(firstWorkout.unit).toBe('reps')

    // First set should start at a manageable volume (around 50-60% of max)
    expect(firstWorkout.sets[0]).toBeGreaterThanOrEqual(5)
    expect(firstWorkout.sets[0]).toBeLessThanOrEqual(7)

    // Progression: later workouts should have equal or greater total volume
    const firstTotalVolume = firstWorkout.sets.reduce((a, b) => a + b, 0)
    const tenthTotalVolume = tenthWorkout.sets.reduce((a, b) => a + b, 0)
    expect(tenthTotalVolume).toBeGreaterThan(firstTotalVolume)
  })

  it('correctly handles isometric time-based disciplines (plank, lsit)', () => {
    const plankTrail = calculateInitialTrail('plank', 60, 20) // 60 seconds max
    expect(plankTrail[0].unit).toBe('seconds')
    expect(plankTrail[0].sets).toHaveLength(5)
    // Starting first set should be around 30-40 seconds
    expect(plankTrail[0].sets[0]).toBeGreaterThanOrEqual(25)
    expect(plankTrail[0].sets[0]).toBeLessThanOrEqual(45)

    const lsitTrail = calculateInitialTrail('lsit', 20, 20) // 20 seconds max
    expect(lsitTrail[0].unit).toBe('seconds')
    expect(lsitTrail[0].sets[0]).toBeGreaterThanOrEqual(8)
  })

  it('supports dumbbells with specified weight and reps', () => {
    const trail = calculateInitialTrail('dumbbells', 12, 20, 16) // 16 kg, 12 reps max
    expect(trail[0].unit).toBe('reps')
    expect(trail[0].weightKg).toBe(16)
    expect(trail[0].sets).toHaveLength(5)
  })

  it('assigns evolving visual grades across the trail (stone -> bronze -> gold -> inferno)', () => {
    const trail = calculateInitialTrail('pushups', 30, 100)

    // 0-25% -> stone
    expect(trail[0].visualGrade).toBe('stone')
    expect(trail[20].visualGrade).toBe('stone')

    // 26-55% -> bronze
    expect(trail[30].visualGrade).toBe('bronze')
    expect(trail[50].visualGrade).toBe('bronze')

    // 56-85% -> gold
    expect(trail[60].visualGrade).toBe('gold')
    expect(trail[80].visualGrade).toBe('gold')

    // 86-100% -> inferno
    expect(trail[88].visualGrade).toBe('inferno')
    expect(trail[99].visualGrade).toBe('inferno')
  })
})

describe('Adaptive Difficulty Feedback', () => {
  it('does not alter downstream workouts when feedback is "normal" or "easy"', () => {
    const initialTrail = calculateInitialTrail('pullups', 10, 20)
    const nextWorkoutBefore = { ...initialTrail[1], sets: [...initialTrail[1].sets] }

    const updatedTrailNormal = applyDifficultyFeedback(initialTrail, 0, 'normal')
    expect(updatedTrailNormal[1].sets).toEqual(nextWorkoutBefore.sets)

    const updatedTrailEasy = applyDifficultyFeedback(initialTrail, 0, 'easy')
    expect(updatedTrailEasy[1].sets).toEqual(nextWorkoutBefore.sets)
  })

  it('decreases volume of the next workout when feedback is "death"', () => {
    const initialTrail = calculateInitialTrail('pullups', 10, 20)
    const nextWorkoutOriginalSets = [...initialTrail[1].sets]

    const updatedTrail = applyDifficultyFeedback(initialTrail, 0, 'death')
    const adjustedNextWorkoutSets = updatedTrail[1].sets

    // Each set in the next workout should be reduced by 1 rep (or floor to min 1)
    const originalTotal = nextWorkoutOriginalSets.reduce((a, b) => a + b, 0)
    const adjustedTotal = adjustedNextWorkoutSets.reduce((a, b) => a + b, 0)

    expect(adjustedTotal).toBeLessThan(originalTotal)
  })

  it('decreases seconds for isometric exercises when feedback is "death"', () => {
    const initialTrail = calculateInitialTrail('plank', 60, 20)
    const nextWorkoutOriginalSets = [...initialTrail[1].sets]

    const updatedTrail = applyDifficultyFeedback(initialTrail, 0, 'death')
    const adjustedNextWorkoutSets = updatedTrail[1].sets

    const originalTotal = nextWorkoutOriginalSets.reduce((a, b) => a + b, 0)
    const adjustedTotal = adjustedNextWorkoutSets.reduce((a, b) => a + b, 0)

    expect(adjustedTotal).toBeLessThan(originalTotal)
  })
})
