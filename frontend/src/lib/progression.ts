export type Discipline = 'pullups' | 'pushups' | 'plank' | 'lsit' | 'dumbbells'

export type VisualGrade = 'stone' | 'bronze' | 'gold' | 'inferno'

export type WorkoutFeedback = 'easy' | 'normal' | 'death'

export interface WorkoutSessionPlan {
  workoutIndex: number
  discipline: Discipline
  sets: number[]
  unit: 'reps' | 'seconds'
  weightKg?: number
  restSeconds: number
  visualGrade: VisualGrade
}

export function getVisualGrade(index: number, total: number): VisualGrade {
  if (total <= 1) return 'stone'
  const progressRatio = index / (total - 1)
  if (progressRatio <= 0.25) return 'stone'
  if (progressRatio <= 0.55) return 'bronze'
  if (progressRatio <= 0.85) return 'gold'
  return 'inferno'
}

export function calculateInitialTrail(
  discipline: Discipline,
  maxBaseline: number,
  totalWorkouts: number,
  weightKg?: number
): WorkoutSessionPlan[] {
  const isTimeBased = discipline === 'plank' || discipline === 'lsit'
  const unit: 'reps' | 'seconds' = isTimeBased ? 'seconds' : 'reps'
  const minUnit = isTimeBased ? 5 : 1

  // Base percentages for the 5 sets in the first workout (~55%, ~50%, ~45%, ~40%, ~35%)
  const setPercentages = [0.55, 0.50, 0.45, 0.40, 0.35]

  const trail: WorkoutSessionPlan[] = []

  for (let i = 0; i < totalWorkouts; i++) {
    const workoutIndex = i + 1
    const progressRatio = totalWorkouts > 1 ? i / (totalWorkouts - 1) : 0
    // Linear progression growth factor: up to +50% total volume growth across the trail
    const growthFactor = 1 + progressRatio * 0.5

    const sets = setPercentages.map((p) => {
      const baseValue = Math.max(minUnit, Math.round(maxBaseline * p))
      return Math.max(minUnit, Math.round(baseValue * growthFactor))
    })

    trail.push({
      workoutIndex,
      discipline,
      sets,
      unit,
      weightKg: discipline === 'dumbbells' ? weightKg : undefined,
      restSeconds: 120,
      visualGrade: getVisualGrade(i, totalWorkouts)
    })
  }

  return trail
}

export interface WorkoutCompletionResult {
  updatedTrail: WorkoutSessionPlan[]
  extraCount: number
  adaptedMessage?: string
}

export function applyWorkoutAdaptiveProgression(
  trail: WorkoutSessionPlan[],
  completedWorkoutIndex: number,
  completedSets: number[],
  feedback: WorkoutFeedback
): WorkoutCompletionResult {
  const newTrail = trail.map((w) => ({
    ...w,
    sets: [...w.sets]
  }))

  const currentWorkout = newTrail[completedWorkoutIndex]
  const plannedTotal = currentWorkout
    ? currentWorkout.sets.reduce((sum, val) => sum + val, 0)
    : 0
  const actualTotal = completedSets.reduce((sum, val) => sum + val, 0)
  const extraCount = Math.max(0, actualTotal - plannedTotal)

  let adaptedMessage: string | undefined = undefined
  const nextIndex = completedWorkoutIndex + 1

  if (feedback === 'death') {
    if (nextIndex < newTrail.length) {
      const target = newTrail[nextIndex]
      const minUnit = target.unit === 'seconds' ? 5 : 1
      const reduction = target.unit === 'seconds' ? 5 : 1
      target.sets = target.sets.map((val) => Math.max(minUnit, val - reduction))
    }
    adaptedMessage = 'Алгоритм снизил объем следующей тренировки для качественного восстановления.'
  } else if (extraCount > 0 || feedback === 'easy') {
    // Overperformance or marked easy: smartly boost future workouts
    if (nextIndex < newTrail.length) {
      const boost = currentWorkout?.unit === 'seconds' ? 5 : 1
      // Boost next remaining workouts
      for (let i = nextIndex; i < newTrail.length; i++) {
        newTrail[i].sets = newTrail[i].sets.map((val) => val + boost)
      }
    }
    if (extraCount > 0) {
      const unitStr = currentWorkout?.unit === 'seconds' ? 'сек.' : 'повт.'
      adaptedMessage = `🔥 Перевыполнение плана на +${extraCount} ${unitStr}! Программа адаптирована под возросшую силу.`
    } else {
      adaptedMessage = '💪 Тренировка прошла легко! Программа немного увеличила нагрузку.'
    }
  }

  return {
    updatedTrail: newTrail,
    extraCount,
    adaptedMessage
  }
}

export function applyDifficultyFeedback(
  trail: WorkoutSessionPlan[],
  currentWorkoutIndex: number,
  feedback: WorkoutFeedback
): WorkoutSessionPlan[] {
  if (feedback === 'normal' || feedback === 'easy') {
    return trail
  }
  const result = applyWorkoutAdaptiveProgression(trail, currentWorkoutIndex, [], feedback)
  return result.updatedTrail
}
