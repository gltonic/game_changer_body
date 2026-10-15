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
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  discipline: initialDiscipline,
  isOpen,
  onClose,
  onSaveTrail
}) => {
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline>(initialDiscipline)

  // Sync if prop changes
  React.useEffect(() => {
    setSelectedDiscipline(initialDiscipline)
  }, [initialDiscipline, isOpen])

  const meta = DISCIPLINES_META[selectedDiscipline]
  const isTimeBased = selectedDiscipline === 'plank' || selectedDiscipline === 'lsit'
  const isDumbbells = selectedDiscipline === 'dumbbells'

  const [maxBaseline, setMaxBaseline] = useState<number>(isTimeBased ? 45 : 10)
  const [weightKg, setWeightKg] = useState<number>(12)
  const [totalWorkouts, setTotalWorkouts] = useState<number>(30)

  // Update defaults when discipline switch occurs
  React.useEffect(() => {
    if (selectedDiscipline === 'plank' || selectedDiscipline === 'lsit') {
      setMaxBaseline(45)
    } else {
      setMaxBaseline(10)
    }
  }, [selectedDiscipline])

  if (!isOpen) return null

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault()
    if (maxBaseline <= 0 || totalWorkouts <= 0) return

    const trail = calculateInitialTrail(
      selectedDiscipline,
      maxBaseline,
      totalWorkouts,
      isDumbbells ? weightKg : undefined
    )

    onSaveTrail(
      selectedDiscipline,
      trail,
      maxBaseline,
      totalWorkouts,
      isDumbbells ? weightKg : undefined
    )
  }

  const allDisciplines: Discipline[] = ['pullups', 'pushups', 'plank', 'lsit', 'dumbbells']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0c0c0e] border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col gap-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#d4af37]/20 to-amber-900/10 border border-[#d4af37]/30 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(212,175,55,0.2)]">
            {meta.icon}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-wide">
              {meta.label}: Настройка тропы
            </h3>
            <p className="text-xs text-zinc-400">
              Выбери дисциплину и укажи свой максимум
            </p>
          </div>
        </div>

        {/* 5 Disciplines horizontal switch */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {allDisciplines.map((d) => {
            const m = DISCIPLINES_META[d]
            const isSel = selectedDiscipline === d
            return (
              <button
                type="button"
                key={d}
                onClick={() => setSelectedDiscipline(d)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all ${
                  isSel
                    ? 'bg-[#d4af37] text-black border-[#d4af37] font-bold shadow-[0_0_12px_rgba(212,175,55,0.4)]'
                    : 'bg-zinc-900/80 border-white/10 text-zinc-400 hover:text-white'
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
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              {isTimeBased ? <Clock size={14} className="text-[#d4af37]" /> : <Flame size={14} className="text-[#d4af37]" />}
              {isTimeBased ? 'Твой текущий рекорд в планке (секунды)' : 'Максимум за 1 чистый подход (повторения)'}
            </label>
            <input
              type="number"
              min={1}
              max={600}
              required
              value={maxBaseline}
              onChange={(e) => setMaxBaseline(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full bg-zinc-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-[#d4af37]/60"
            />
          </div>

          {/* Dumbbells Weight Input */}
          {isDumbbells && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Dumbbell size={14} className="text-[#d4af37]" />
                Вес одной гантели (кг)
              </label>
              <input
                type="number"
                min={0.5}
                step={0.5}
                required
                value={weightKg}
                onChange={(e) => setWeightKg(parseFloat(e.target.value) || 1)}
                className="w-full bg-zinc-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-[#d4af37]/60"
              />
            </div>
          )}

          {/* Total Workouts Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              Количество тренировок в тропе
            </label>
            <input
              type="number"
              min={5}
              max={180}
              required
              value={totalWorkouts}
              onChange={(e) => setTotalWorkouts(Math.max(5, parseInt(e.target.value) || 20))}
              className="w-full bg-zinc-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-[#d4af37]/60"
            />
            <span className="text-[11px] text-zinc-400">
              Рекомендуем 20–30 тренировок для видимого прироста силы
            </span>
          </div>

          <button
            type="submit"
            className="mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#d4af37] to-amber-600 hover:from-amber-400 hover:to-amber-600 text-black font-bold text-sm tracking-wide shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all cursor-pointer active:scale-95"
          >
            <Sparkles size={16} />
            Рассчитать тропу прогрессии
          </button>
        </form>
      </div>
    </div>
  )
}
