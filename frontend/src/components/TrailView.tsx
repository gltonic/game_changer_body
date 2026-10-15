import React, { useEffect } from 'react'
import { Check, Lock, Play, Dumbbell } from 'lucide-react'
import type { WorkoutSessionPlan, VisualGrade } from '../lib/progression'

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

  const getGradeStyles = (grade: VisualGrade, isCurrent: boolean, isCompleted: boolean) => {
    if (isCompleted) {
      return {
        card: 'bg-zinc-900/60 border-zinc-700/40 text-zinc-400',
        badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
        glow: ''
      }
    }

    switch (grade) {
      case 'stone':
        return {
          card: isCurrent
            ? 'bg-zinc-800 border-zinc-500 shadow-[0_0_20px_rgba(161,161,170,0.3)] ring-2 ring-zinc-400/50'
            : 'bg-zinc-900 border-zinc-800 text-zinc-400',
          badge: 'bg-zinc-700/30 text-zinc-300 border border-zinc-600/30',
          glow: ''
        }
      case 'bronze':
        return {
          card: isCurrent
            ? 'bg-gradient-to-b from-amber-950/60 to-zinc-900 border-amber-700 shadow-[0_0_20px_rgba(180,83,9,0.4)] ring-2 ring-amber-500/50'
            : 'bg-zinc-900/80 border-amber-900/40 text-amber-200/70',
          badge: 'bg-amber-950/50 text-amber-300 border border-amber-700/40',
          glow: ''
        }
      case 'gold':
        return {
          card: isCurrent
            ? 'bg-gradient-to-b from-yellow-950/70 via-zinc-900 to-zinc-950 border-[#d4af37] shadow-[0_0_25px_rgba(212,175,55,0.45)] ring-2 ring-[#d4af37]/60'
            : 'bg-zinc-900/80 border-[#d4af37]/40 text-[#d4af37]/70',
          badge: 'bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/30',
          glow: ''
        }
      case 'inferno':
        return {
          card: isCurrent
            ? 'bg-gradient-to-b from-red-950/80 via-orange-950/60 to-zinc-950 border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.6)] ring-2 ring-orange-500/80 animate-pulse'
            : 'bg-zinc-900/80 border-orange-900/50 text-orange-300/70',
          badge: 'bg-red-950/50 text-orange-400 border border-orange-600/40',
          glow: ''
        }
    }
  }

  return (
    <div className="relative w-full flex flex-col items-center py-8 pb-36">
      {/* Background connecting progression curve */}
      <div className="absolute top-12 bottom-32 w-1 bg-gradient-to-b from-zinc-800 via-[#d4af37]/40 to-orange-500/60 -z-10 rounded-full" />

      <div className="flex flex-col items-center gap-10 w-full max-w-sm">
        {trail.map((workout, idx) => {
          const isCompleted = idx < currentWorkoutIndex
          const isCurrent = idx === currentWorkoutIndex
          const isLocked = idx > currentWorkoutIndex
          const offsetX = getOffsetX(idx)
          const styles = getGradeStyles(workout.visualGrade, isCurrent, isCompleted)

          return (
            <div
              key={workout.workoutIndex}
              id={`node-workout-${idx}`}
              style={{ transform: `translateX(${offsetX}px)` }}
              className="relative transition-transform duration-300 ease-out"
            >
              <div
                className={`w-48 rounded-2xl p-4 border transition-all duration-300 flex flex-col gap-2 ${
                  styles.card
                } ${isCurrent ? 'scale-105' : ''} ${isLocked ? 'opacity-50' : ''}`}
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-zinc-400">
                    Тренировка #{workout.workoutIndex}
                  </span>
                  <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${styles.badge}`}>
                    {workout.visualGrade.toUpperCase()}
                  </div>
                </div>

                {/* Sets preview */}
                <div className="flex items-center justify-between my-1">
                  <div className="flex items-center gap-1">
                    {workout.sets.map((set, setIdx) => (
                      <span
                        key={setIdx}
                        className={`text-xs font-mono font-semibold px-1 py-0.5 rounded ${
                          isCompleted
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : isCurrent
                            ? 'bg-[#d4af37]/15 text-[#d4af37]'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {set}
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {workout.unit === 'seconds' ? 'сек' : 'повт'}
                  </span>
                </div>

                {workout.weightKg && (
                  <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
                    <Dumbbell size={12} className="text-[#d4af37]" />
                    <span>{workout.weightKg} кг</span>
                  </div>
                )}

                {/* Action button */}
                <div className="mt-1">
                  {isCompleted ? (
                    <div className="w-full py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5">
                      <Check size={14} /> Выполнено
                    </div>
                  ) : isCurrent ? (
                    <button
                      onClick={() => onStartWorkout(workout)}
                      className="w-full py-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-amber-600 hover:from-amber-400 hover:to-amber-600 text-black font-extrabold text-xs tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(212,175,55,0.4)] transition-all cursor-pointer active:scale-95"
                    >
                      <Play size={14} fill="currentColor" /> Начать
                    </button>
                  ) : (
                    <div className="w-full py-1.5 rounded-lg bg-zinc-950/80 border border-white/5 text-zinc-400 text-xs font-semibold flex items-center justify-center gap-1.5">
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
