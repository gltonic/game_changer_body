import React, { useState } from 'react'
import { Bell, Skull, ThumbsUp, Smile, Check } from 'lucide-react'
import type { WorkoutFeedback, WorkoutSessionPlan } from '../lib/progression'

interface FeedbackAndScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (feedback: WorkoutFeedback, nextWorkoutDate?: string) => void
  completedSets?: number[]
  plan?: WorkoutSessionPlan
}

export const FeedbackAndScheduleModal: React.FC<FeedbackAndScheduleModalProps> = ({
  isOpen,
  onSave,
  completedSets = [],
  plan
}) => {
  const [selectedFeedback, setSelectedFeedback] = useState<WorkoutFeedback>('normal')
  const [enableNotification, setEnableNotification] = useState<boolean>(true)

  const plannedTotal = plan ? plan.sets.reduce((a: number, b: number) => a + b, 0) : 0
  const actualTotal = completedSets.length > 0 ? completedSets.reduce((a: number, b: number) => a + b, 0) : plannedTotal
  const extraTotal = Math.max(0, actualTotal - plannedTotal)

  // Default next date: tomorrow at 12:00
  const getTomorrowAtNoon = () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(12, 0, 0, 0)
    // Convert to format for datetime-local: YYYY-MM-DDTHH:mm
    const tzOffset = d.getTimezoneOffset() * 60000
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16)
  }

  const [scheduledDateTime, setScheduledDateTime] = useState<string>(getTomorrowAtNoon())

  if (!isOpen) return null

  const setPresetTime = (daysFromNow: number, hour: number) => {
    const d = new Date()
    d.setDate(d.getDate() + daysFromNow)
    d.setHours(hour, 0, 0, 0)
    const tzOffset = d.getTimezoneOffset() * 60000
    setScheduledDateTime(new Date(d.getTime() - tzOffset).toISOString().slice(0, 16))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(
      selectedFeedback,
      enableNotification ? new Date(scheduledDateTime).toISOString() : undefined
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 safe-modal-container bg-black/90 backdrop-blur-lg animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0a0a0c] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-5">
        {/* Celebration Header */}
        <div className="text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#d4af37]/30 to-amber-500/20 border border-[#d4af37]/40 flex items-center justify-center text-3xl shadow-[0_0_25px_rgba(212,175,55,0.3)] mb-2">
            🏆
          </div>
          <h2 className="text-xl font-black text-white tracking-wide">
            Тренировка завершена!
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Все 5 подходов успешно зафиксированы.
          </p>

          {/* Performance Summary Banner */}
          {plan && completedSets.length > 0 && (
            <div className="w-full mt-3 p-3 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-400">Фактический объем:</span>
                <span className="text-white font-bold">
                  {actualTotal} {plan.unit === 'seconds' ? 'сек' : 'повт'} (план: {plannedTotal})
                </span>
              </div>

              {extraTotal > 0 && (
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-gradient-to-r from-amber-950/60 to-orange-950/50 border border-[#d4af37]/50 text-[#d4af37] text-xs font-semibold">
                  <span>🔥</span>
                  <span>
                    Сверх плана: <b>+{extraTotal} {plan.unit === 'seconds' ? 'сек.' : 'повт.'}</b>! Будет учтено в тропе.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Step 1: Difficulty Feedback */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
              1. Как прошла тренировка?
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedFeedback('easy')}
                className={`flex flex-col items-center justify-center py-3.5 px-2 rounded-2xl border transition-all cursor-pointer ${
                  selectedFeedback === 'easy'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                <ThumbsUp size={20} className="mb-1" />
                <span className="text-xs font-bold">Легко</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFeedback('normal')}
                className={`flex flex-col items-center justify-center py-3.5 px-2 rounded-2xl border transition-all cursor-pointer ${
                  selectedFeedback === 'normal'
                    ? 'bg-amber-950/60 border-[#d4af37] text-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.3)]'
                    : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                <Smile size={20} className="mb-1" />
                <span className="text-xs font-bold">Нормально</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFeedback('death')}
                className={`flex flex-col items-center justify-center py-3.5 px-2 rounded-2xl border transition-all cursor-pointer ${
                  selectedFeedback === 'death'
                    ? 'bg-red-950/60 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                    : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                <Skull size={20} className="mb-1" />
                <span className="text-xs font-bold">Смерть</span>
              </button>
            </div>
            {selectedFeedback === 'death' && (
              <span className="text-[11px] text-red-400/90 font-mono mt-0.5">
                ⚡ Алгоритм снизит объем следующей тренировки, чтобы ты восстановился.
              </span>
            )}
          </div>

          {/* Step 2: Notification Schedule */}
          <div className="flex flex-col gap-3 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Bell size={14} className="text-[#d4af37]" />
                2. Напомнить о следующей тренировке?
              </label>
              <input
                type="checkbox"
                checked={enableNotification}
                onChange={(e) => setEnableNotification(e.target.checked)}
                className="w-4 h-4 accent-[#d4af37] cursor-pointer"
              />
            </div>

            {enableNotification && (
              <div className="flex flex-col gap-2.5 animate-in fade-in duration-200">
                {/* Presets */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPresetTime(1, 11)}
                    className="flex-1 py-1.5 rounded-lg bg-zinc-900 border border-white/10 hover:border-white/20 text-zinc-300 text-[11px] font-semibold transition-all cursor-pointer"
                  >
                    Завтра 11:00
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetTime(1, 15)}
                    className="flex-1 py-1.5 rounded-lg bg-zinc-900 border border-white/10 hover:border-white/20 text-zinc-300 text-[11px] font-semibold transition-all cursor-pointer"
                  >
                    Завтра 15:00
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetTime(2, 12)}
                    className="flex-1 py-1.5 rounded-lg bg-zinc-900 border border-white/10 hover:border-white/20 text-zinc-300 text-[11px] font-semibold transition-all cursor-pointer"
                  >
                    Через 2 дня
                  </button>
                </div>

                {/* Custom DateTime picker */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-zinc-400 font-mono">Точные дата и время:</span>
                  <input
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    className="w-full bg-zinc-900/90 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#d4af37]/60"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#d4af37] to-amber-600 hover:from-amber-400 hover:to-amber-600 text-black font-extrabold text-sm tracking-wide shadow-[0_0_20px_rgba(212,175,55,0.4)] flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <Check size={18} className="stroke-[3]" /> Зафиксировать результат
          </button>
        </form>
      </div>
    </div>
  )
}
