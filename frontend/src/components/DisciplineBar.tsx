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
    <div className="w-full overflow-x-auto no-scrollbar py-1">
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
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-white text-black font-bold'
                  : 'bg-[#1C1C1E] text-[#8E8E93] hover:text-white font-medium'
              }`}
            >
              <span className="text-base">{meta.icon}</span>
              <div className="flex flex-col text-left">
                <span className="text-xs leading-tight tracking-tight">{meta.label}</span>
                <span
                  className={`text-[10px] mt-0.5 leading-none ${
                    isSelected ? 'text-zinc-600 font-semibold' : 'text-[#8E8E93]'
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
export default DisciplineBar
