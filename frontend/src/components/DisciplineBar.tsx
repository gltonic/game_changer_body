import React from 'react'
import type { Discipline } from '../lib/progression'

export const DISCIPLINES_META: Record<
  Discipline,
  { label: string; icon: string; unitLabel: string }
> = {
  pullups: { label: 'Подтягивания', icon: '🦾', unitLabel: 'повт.' },
  pushups: { label: 'Отжимания', icon: '⚡', unitLabel: 'повт.' },
  plank: { label: 'Планка', icon: '🛡️', unitLabel: 'сек.' },
  lsit: { label: 'Уголок', icon: '📐', unitLabel: 'сек.' },
  dumbbells: { label: 'Гантели', icon: '🏋️', unitLabel: 'кг + повт.' }
}

interface DisciplineBarProps {
  currentDiscipline: Discipline
  onSelect: (d: Discipline) => void
  userDisciplines: Record<string, { current_workout_index: number; total_workouts: number } | undefined>
}

export const DisciplineBar: React.FC<DisciplineBarProps> = ({
  currentDiscipline,
  onSelect,
  userDisciplines
}) => {
  const disciplines: Discipline[] = ['pullups', 'pushups', 'plank', 'lsit', 'dumbbells']

  return (
    <div className="w-full overflow-x-auto no-scrollbar py-2 px-1">
      <div className="flex items-center gap-2 min-w-max">
        {disciplines.map((d) => {
          const meta = DISCIPLINES_META[d]
          const isSelected = currentDiscipline === d
          const progress = userDisciplines[d]
          const progressText = progress
            ? `${progress.current_workout_index + 1}/${progress.total_workouts}`
            : 'Старт'

          return (
            <button
              key={d}
              onClick={() => onSelect(d)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all duration-200 border cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-r from-zinc-800 to-zinc-900 border-[#d4af37]/60 text-white shadow-[0_0_15px_rgba(212,175,55,0.25)]'
                  : 'bg-zinc-950/70 border-white/5 text-zinc-400 hover:text-white hover:border-white/10'
              }`}
            >
              <span className="text-lg">{meta.icon}</span>
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold leading-tight">{meta.label}</span>
                <span
                  className={`text-[10px] font-mono leading-none mt-0.5 ${
                    isSelected ? 'text-[#d4af37]' : 'text-zinc-400'
                  }`}
                >
                  {progressText}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
