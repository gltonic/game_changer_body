import React, { useEffect } from 'react'
import { Check, Lock, Play, Dumbbell } from 'lucide-react'
import type { WorkoutSessionPlan } from '../lib/progression'

interface TrailViewProps {
  trail: WorkoutSessionPlan[]
  currentWorkoutIndex: number
  onStartWorkout: (workout: WorkoutSessionPlan) => void
  onOpenSettings?: () => void
}

export const TrailView: React.FC<TrailViewProps> = ({
  trail,
  currentWorkoutIndex,
  onStartWorkout
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentElement = document.getElementById(`node-workout-${currentWorkoutIndex}`)
      if (currentElement) {
        currentElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [currentWorkoutIndex, trail.length])

  const getOffsetX = (idx: number) => Math.sin(idx * 0.75) * 60

  return (
    <div className="relative w-full flex flex-col items-center py-8 pb-36">
      {/* Minimal clean connecting progression line (Apple style) */}
      <div className="absolute top-12 bottom-32 w-1 bg-[#2C2C2E] -z-10 rounded-full" />

      <div className="flex flex-col items-center gap-8 w-full max-w-sm">
        {trail.map((workout, idx) => {
          const isCompleted = idx < currentWorkoutIndex
          const isCurrent = idx === currentWorkoutIndex
          const offsetX = getOffsetX(idx)

          return (
            <div
              key={workout.workoutIndex}
              id={`node-workout-${idx}`}
              style={{ transform: `translateX(${offsetX}px)` }}
              className="relative transition-transform duration-300 ease-out"
            >
              {/* Apple Health style Card: borderless, solid #1C1C1E, rounded-3xl */}
              <div
                className={`w-52 rounded-3xl p-5 transition-all duration-200 flex flex-col gap-3.5 ${
                  isCurrent
                    ? 'bg-[#1C1C1E] scale-105 shadow-xl'
                    : isCompleted
                    ? 'bg-[#1C1C1E]/80'
                    : 'bg-[#1C1C1E]/50 opacity-60'
                }`}
              >
                {/* Header row: Workout index & Grade */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#8E8E93]">
                    Тренировка #{workout.workoutIndex}
                  </span>
                  <div
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                      isCompleted
                        ? 'bg-[#30D158]/15 text-[#30D158]'
                        : isCurrent
                        ? 'bg-[#FF9F0A]/15 text-[#FF9F0A]'
                        : 'bg-[#2C2C2E] text-[#8E8E93]'
                    }`}
                  >
                    {workout.visualGrade.toUpperCase()}
                  </div>
                </div>

                {/* Sets preview */}
                <div className="flex items-center justify-between my-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {workout.sets.map((set, setIdx) => (
                      <span
                        key={setIdx}
                        className={`text-xs font-bold px-2 py-1 rounded-xl ${
                          isCompleted
                            ? 'bg-[#30D158]/15 text-[#30D158]'
                            : isCurrent
                            ? 'bg-[#2C2C2E] text-white'
                            : 'bg-[#2C2C2E]/60 text-[#8E8E93]'
                        }`}
                      >
                        {set}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-[#8E8E93] font-medium shrink-0">
                    {workout.unit === 'seconds' ? 'сек' : 'повт'}
                  </span>
                </div>

                {workout.weightKg && (
                  <div className="flex items-center gap-1.5 text-xs text-[#8E8E93] font-medium">
                    <Dumbbell size={13} className="text-[#FF9F0A]" />
                    <span>{workout.weightKg} кг</span>
                  </div>
                )}

                {/* Action CTA Button */}
                <div className="mt-1">
                  {isCompleted ? (
                    <div className="w-full py-2.5 rounded-full bg-[#30D158]/15 text-[#30D158] text-xs font-semibold flex items-center justify-center gap-1.5">
                      <Check size={14} strokeWidth={2.5} /> Выполнено
                    </div>
                  ) : isCurrent ? (
                    <button
                      onClick={() => onStartWorkout(workout)}
                      className="w-full py-2.5 rounded-full bg-white hover:bg-zinc-200 text-black font-bold text-xs tracking-tight flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    >
                      <Play size={13} fill="currentColor" /> Начать
                    </button>
                  ) : (
                    <div className="w-full py-2.5 rounded-full bg-[#2C2C2E] text-[#8E8E93] text-xs font-medium flex items-center justify-center gap-1.5">
                      <Lock size={12} /> Заблокировано
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
export default TrailView
