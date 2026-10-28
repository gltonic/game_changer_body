import React, { useState } from 'react'
import { Sparkles, X, Dumbbell, Clock, Flame } from 'lucide-react'
import { DISCIPLINES_META } from './DisciplineBar'
import { calculateInitialTrail, type Discipline, type WorkoutSessionPlan } from '../lib/progression'

interface OnboardingModalProps {
  discipline: Discipline
  isOpen: boolean
  onClose: () => void
  onSaveTrail: (
    discipline: Discipline,
    trail: WorkoutSessionPlan[],
    maxBaseline: number,
    totalWorkouts: number,
    weightKg?: number
  ) => void
  initialData?: {
    max_baseline?: number
    total_workouts?: number
    weight_kg?: number
  }
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  discipline: initialDiscipline,
  isOpen,
  onClose,
  onSaveTrail,
  initialData
}) => {
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline>(initialDiscipline)

  const meta = DISCIPLINES_META[selectedDiscipline]
  const isTimeBased = selectedDiscipline === 'plank' || selectedDiscipline === 'lsit'
  const isDumbbells = selectedDiscipline === 'dumbbells'

  const [maxBaseline, setMaxBaseline] = useState<string>(
    initialData?.max_baseline ? String(initialData.max_baseline) : isTimeBased ? '45' : '10'
  )
  const [weightKg, setWeightKg] = useState<string>(
    initialData?.weight_kg ? String(initialData.weight_kg) : '12'
  )
  const [totalWorkouts, setTotalWorkouts] = useState<string>(
    initialData?.total_workouts ? String(initialData.total_workouts) : '30'
  )

  // Sync if prop changes or opened
  React.useEffect(() => {
    setSelectedDiscipline(initialDiscipline)
    if (initialData?.max_baseline) {
      setMaxBaseline(String(initialData.max_baseline))
    } else {
      setMaxBaseline(initialDiscipline === 'plank' || initialDiscipline === 'lsit' ? '45' : '10')
    }
    if (initialData?.total_workouts) {
      setTotalWorkouts(String(initialData.total_workouts))
    } else {
      setTotalWorkouts('30')
    }
    if (initialData?.weight_kg) {
      setWeightKg(String(initialData.weight_kg))
    }
  }, [initialDiscipline, isOpen, initialData])

  if (!isOpen) return null

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault()
    const parsedMax = Math.max(1, parseInt(maxBaseline) || 1)
    const parsedTotal = Math.max(5, parseInt(totalWorkouts) || 20)
    const parsedWeight = isDumbbells ? Math.max(0.5, parseFloat(weightKg) || 12) : undefined

    const trail = calculateInitialTrail(
      selectedDiscipline,
      parsedMax,
      parsedTotal,
      parsedWeight
    )

    onSaveTrail(
      selectedDiscipline,
      trail,
      parsedMax,
      parsedTotal,
      parsedWeight
    )
  }

  const allDisciplines: Discipline[] = ['pullups', 'pushups', 'plank', 'lsit', 'dumbbells']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 safe-modal-container bg-black/85 backdrop-blur-2xl animate-in fade-in duration-200">
      {/* iOS style modal surface: borderless, solid #1C1C1E */}
      <div className="relative w-full max-w-md bg-[#1C1C1E] rounded-3xl p-6 shadow-2xl flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 w-full">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="w-12 h-12 rounded-full bg-[#2C2C2E] flex items-center justify-center text-2xl shrink-0">
              {meta.icon}
            </div>
            <div className="flex flex-col min-w-0">
              <h3 className="text-xl font-bold text-white tracking-tight truncate">
                {meta.label}
              </h3>
              <p className="text-xs text-[#8E8E93] mt-0.5 truncate">
                Настройка прогрессии и параметров тропы
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8E8E93] hover:text-white transition-colors p-2 rounded-full hover:bg-[#2C2C2E] cursor-pointer shrink-0 -mt-1 -mr-1"
            title="Закрыть"
          >
            <X size={20} />
          </button>
        </div>

        {/* 5 Disciplines horizontal switch */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {allDisciplines.map((d) => {
            const m = DISCIPLINES_META[d]
            const isSel = selectedDiscipline === d
            return (
              <button
                type="button"
                key={d}
                onClick={() => {
                  setSelectedDiscipline(d)
                  if (!initialData) {
                    setMaxBaseline(d === 'plank' || d === 'lsit' ? '45' : '10')
                  }
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSel
                    ? 'bg-white text-black font-bold'
                    : 'bg-[#2C2C2E] text-[#8E8E93] hover:text-white'
                }`}
              >
                <span>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            )
          })}
        </div>

        <form onSubmit={handleGenerate} className="flex flex-col gap-4">
          {/* Baseline Max Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#8E8E93] ml-1 flex items-center gap-1.5">
              {isTimeBased ? <Clock size={14} className="text-[#0A84FF]" /> : <Flame size={14} className="text-[#FF9F0A]" />}
              {isTimeBased ? 'Текущий рекорд в планке (секунды)' : 'Максимум за 1 чистый подход (повторения)'}
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              value={maxBaseline}
              onChange={(e) => setMaxBaseline(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder={isTimeBased ? 'Например: 45' : 'Например: 10'}
              className="w-full bg-[#2C2C2E] rounded-2xl px-4 py-3 text-white text-base font-bold focus:outline-none placeholder:text-[#8E8E93]"
            />
          </div>

          {/* Dumbbells Weight Input */}
          {isDumbbells && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#8E8E93] ml-1 flex items-center gap-1.5">
                <Dumbbell size={14} className="text-[#0A84FF]" />
                Вес одной гантели (кг)
              </label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="12"
                className="w-full bg-[#2C2C2E] rounded-2xl px-4 py-3 text-white text-base font-bold focus:outline-none placeholder:text-[#8E8E93]"
              />
            </div>
          )}

          {/* Total Workouts Input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between ml-1">
              <label className="text-xs font-semibold text-[#8E8E93]">
                Количество тренировок в цикле
              </label>
              <span className="text-[11px] text-[#8E8E93]">Рекомендуем 20–30</span>
            </div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              value={totalWorkouts}
              onChange={(e) => setTotalWorkouts(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="30"
              className="w-full bg-[#2C2C2E] rounded-2xl px-4 py-3 text-white text-base font-bold focus:outline-none placeholder:text-[#8E8E93]"
            />
          </div>

          <button
            type="submit"
            className="mt-2 w-full flex items-center justify-center gap-2 py-4 rounded-full bg-white hover:bg-zinc-200 text-black font-bold text-sm tracking-tight transition-all cursor-pointer active:scale-95"
          >
            <Sparkles size={16} />
            <span>Рассчитать тропу прогрессии</span>
          </button>
        </form>
      </div>
    </div>
  )
}
export default OnboardingModal
