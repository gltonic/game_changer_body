import React from 'react'
import {
  X,
  Play,
  Pause,
  Plus,
  Minus,
  SkipForward,
  Check,
  Flame,
  Clock,
  Timer as TimerIcon,
  Sparkles
} from 'lucide-react'
import { useWorkoutSession } from '../lib/useWorkoutSession'
import type { WorkoutSessionPlan } from '../lib/progression'
import { DISCIPLINES_META } from './DisciplineBar'

interface WorkoutModalProps {
  plan: WorkoutSessionPlan
  isOpen: boolean
  onClose: () => void
  onFinishWorkout: (completedSets: number[]) => void
}

export const WorkoutModal: React.FC<WorkoutModalProps> = ({
  plan,
  isOpen,
  onClose,
  onFinishWorkout
}) => {
  const meta = DISCIPLINES_META[plan.discipline]
  const isTimeBased = plan.unit === 'seconds'

  const session = useWorkoutSession(plan, {
    onWorkoutComplete: (sets) => {
      onFinishWorkout(sets)
    }
  })

  if (!isOpen) return null

  const formatSeconds = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = Math.max(0, totalSeconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const currentTarget = session.currentSetTarget
  const currentActual = session.currentSetActual
  const extraDiff = currentActual - currentTarget

  const handleFinishSetClick = () => {
    session.completeCurrentSet(currentActual)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0a0a0d] border border-white/10 rounded-3xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col gap-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/5"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-zinc-900 to-zinc-800 border border-white/10 flex items-center justify-center text-2xl shadow-inner">
            {meta.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white tracking-wide">
                {meta.label}
              </h2>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/30">
                #{plan.workoutIndex}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              5 подходов • {plan.weightKg ? `${plan.weightKg} кг • ` : ''}Отдых {plan.restSeconds}с
            </p>
          </div>
        </div>

        {/* 5 Sets Indicator */}
        <div className="grid grid-cols-5 gap-1.5 w-full">
          {plan.sets.map((setTarget, idx) => {
            const isCompleted = idx < session.completedSets.length
            const isCurrent = idx === session.currentSetIndex && session.status !== 'completed'
            const actualLogged = session.completedSets[idx]

            return (
              <div
                key={idx}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all duration-300 ${
                  isCompleted
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
                    : isCurrent
                    ? 'bg-[#d4af37]/20 border-[#d4af37] text-white shadow-[0_0_15px_rgba(212,175,55,0.3)] ring-1 ring-[#d4af37]/50'
                    : 'bg-zinc-900/60 border-white/5 text-zinc-500'
                }`}
              >
                <span className="text-[9px] uppercase font-mono font-bold text-zinc-400">
                  Сет {idx + 1}
                </span>
                <span className="text-xs font-extrabold font-mono mt-0.5 flex items-center gap-0.5">
                  {isCompleted ? (
                    <>
                      <Check size={12} className="inline stroke-[3]" />
                      <span>{actualLogged}</span>
                    </>
                  ) : (
                    setTarget
                  )}
                </span>
                <span className="text-[8px] text-zinc-400">
                  {isTimeBased ? 'сек' : 'повт'}
                </span>
              </div>
            )
          })}
        </div>

        {/* ================= STATE 1: IDLE ================= */}
        {session.status === 'idle' && (
          <div className="flex flex-col items-center justify-center py-8 gap-5 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#d4af37]/20 via-zinc-900 to-amber-600/20 border border-[#d4af37]/30 flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.2)]">
              <Flame size={36} className="text-[#d4af37]" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Готов к микротренировке?</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                Подход 1 из 5: цель <span className="text-white font-bold">{plan.sets[0]} {isTimeBased ? 'секунд' : 'повторений'}</span>.
                Таймер запустится сразу при нажатии!
              </p>
            </div>
            <button
              onClick={session.startWorkout}
              className="mt-2 w-full py-4 rounded-2xl bg-gradient-to-r from-[#d4af37] to-amber-600 hover:from-amber-400 hover:to-amber-600 text-black font-black text-sm tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(212,175,55,0.4)] transition-all cursor-pointer active:scale-95"
            >
              <Play size={18} fill="currentColor" /> Начать подход 1 (Запустить таймер)
            </button>
          </div>
        )}

        {/* ================= STATE 2: IN SET (ACTIVE LIVE TIMER + REPS TRACKER) ================= */}
        {session.status === 'in_set' && (
          <div className="flex flex-col items-center justify-center py-4 gap-5">
            {/* Live Timer Arena */}
            <div className="relative flex flex-col items-center justify-center w-48 h-48 rounded-full bg-gradient-to-b from-zinc-900 to-black border-4 border-[#d4af37]/50 shadow-[0_0_35px_rgba(212,175,55,0.25)]">
              {/* Main counter display */}
              {isTimeBased ? (
                <>
                  <div className="flex items-center gap-1 text-[#d4af37] text-xs font-mono font-bold tracking-wider uppercase mb-1">
                    <TimerIcon size={14} className={session.isSetPaused ? '' : 'animate-spin text-[#d4af37]'} />
                    <span>{session.isSetPaused ? 'Пауза' : 'Таймер планки'}</span>
                  </div>
                  <div className="text-5xl font-black font-mono text-white tracking-tight flex items-baseline">
                    {session.activeSetSeconds}
                    <span className="text-base font-normal text-zinc-400 ml-1.5 font-sans">сек</span>
                  </div>
                  <div className="text-[11px] font-mono text-zinc-400 mt-1">
                    Цель: <span className="text-zinc-200 font-bold">{currentTarget} сек</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1 text-[#d4af37] text-xs font-mono font-bold tracking-wider uppercase mb-1">
                    <Clock size={14} className="text-[#d4af37] animate-pulse" />
                    <span>Секундомер подхода</span>
                  </div>
                  <div className="text-5xl font-black font-mono text-white tracking-tight flex items-baseline">
                    {formatSeconds(session.activeSetSeconds)}
                  </div>
                  <div className="text-xs font-mono text-[#d4af37] font-bold mt-1 bg-[#d4af37]/10 px-2.5 py-0.5 rounded-full border border-[#d4af37]/20">
                    Цель: {currentTarget} повт.
                  </div>
                </>
              )}

              {/* Live Overperformance Badge */}
              {extraDiff > 0 && (
                <div className="absolute -bottom-3 bg-gradient-to-r from-amber-500 to-orange-500 text-black px-3 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase shadow-[0_0_15px_rgba(245,158,11,0.5)] flex items-center gap-1 animate-bounce">
                  <Sparkles size={11} /> +{extraDiff} сверх плана!
                </div>
              )}
            </div>

            {/* Set Adjuster Controls (User can do more reps/seconds!) */}
            <div className="flex flex-col items-center gap-2 w-full">
              <span className="text-[11px] font-mono text-zinc-400">
                Сделал больше или меньше? Настрой факт:
              </span>
              <div className="flex items-center justify-center gap-3 w-full max-w-xs">
                <button
                  type="button"
                  onClick={() => session.adjustActualCount(-1)}
                  className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 hover:border-white/20 text-white font-bold text-xl flex items-center justify-center transition-all active:scale-90"
                  title="-1"
                >
                  <Minus size={18} />
                </button>

                <div className="flex-1 py-1.5 px-3 rounded-2xl bg-zinc-950 border border-white/15 text-center hover:border-[#d4af37]/60 transition-colors flex flex-col items-center justify-center">
                  <span className="text-[10px] text-zinc-400 font-mono block">Фактический итог</span>
                  <div className="flex items-center justify-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={999}
                      value={currentActual}
                      onChange={(e) => session.setActualCount(parseInt(e.target.value) || 0)}
                      className="w-16 bg-transparent text-xl font-mono font-black text-[#d4af37] text-center focus:outline-none"
                    />
                    <span className="text-xs font-mono text-zinc-400">{isTimeBased ? 'сек' : 'повт'}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => session.adjustActualCount(1)}
                  className="w-12 h-12 rounded-2xl bg-zinc-900 border border-[#d4af37]/40 hover:border-[#d4af37] text-[#d4af37] font-bold text-xl flex items-center justify-center transition-all active:scale-90 shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                  title="+1"
                >
                  <Plus size={18} />
                </button>
              </div>

              {/* Extra button for time-based exercises (+5 sec) */}
              {isTimeBased && (
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={session.togglePauseSetTimer}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs font-semibold text-zinc-300 flex items-center gap-1.5"
                  >
                    {session.isSetPaused ? <Play size={12} fill="currentColor" /> : <Pause size={12} fill="currentColor" />}
                    {session.isSetPaused ? 'Продолжить' : 'Пауза'}
                  </button>

                  <button
                    type="button"
                    onClick={() => session.addSetTime(5)}
                    className="px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-600/40 text-amber-300 text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus size={12} /> +5 сек к таймеру
                  </button>
                </div>
              )}
            </div>

            {/* Complete Set Button */}
            <button
              onClick={handleFinishSetClick}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-black text-sm tracking-wide shadow-[0_0_25px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 mt-1"
            >
              <Check size={20} className="stroke-[3]" />
              {session.currentSetIndex === 4
                ? `Завершить всю тренировку (${currentActual} ${isTimeBased ? 'сек' : 'повт'}) 🏁`
                : `Зафиксировать ${currentActual} ${isTimeBased ? 'сек' : 'повт'} (Отдых 2 мин) ➔`}
            </button>
          </div>
        )}

        {/* ================= STATE 3: RESTING (REST COUNTDOWN TIMER) ================= */}
        {session.status === 'resting' && (
          <div className="flex flex-col items-center justify-center py-5 gap-5">
            {/* Countdown Display */}
            <div className="relative flex flex-col items-center justify-center w-48 h-48 rounded-full bg-zinc-950 border-4 border-[#d4af37] shadow-[0_0_40px_rgba(212,175,55,0.35)]">
              <Clock size={22} className="text-[#d4af37] mb-1 animate-pulse" />
              <div className="text-4xl font-black font-mono text-white tracking-wider">
                {formatSeconds(session.remainingRest)}
              </div>
              <span className="text-[11px] font-mono font-bold text-[#d4af37] tracking-widest uppercase mt-0.5">
                {session.isRestPaused ? 'ПАУЗА' : 'ОТДЫХ'}
              </span>
            </div>

            <div className="text-xs text-zinc-400 text-center bg-zinc-900/60 border border-white/5 px-4 py-2 rounded-xl">
              Следующий подход <span className="text-white font-bold">{session.currentSetIndex + 2} из 5</span>:{' '}
              <span className="text-[#d4af37] font-bold">
                {plan.sets[session.currentSetIndex + 1]} {isTimeBased ? 'сек' : 'повт'}
              </span>
            </div>

            {/* Timer controls */}
            <div className="flex items-center gap-2 w-full">
              <button
                onClick={session.togglePauseRest}
                className="flex-1 py-3 rounded-xl bg-zinc-900 border border-white/10 hover:border-white/20 text-zinc-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {session.isRestPaused ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
                {session.isRestPaused ? 'Продолжить' : 'Пауза'}
              </button>

              <button
                onClick={() => session.addRestTime(30)}
                className="flex-1 py-3 rounded-xl bg-zinc-900 border border-[#d4af37]/30 hover:border-[#d4af37] text-[#d4af37] text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus size={14} /> +30 сек
              </button>

              <button
                onClick={session.skipRest}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-zinc-800 to-zinc-900 border border-white/10 hover:border-white/20 text-zinc-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <SkipForward size={14} /> Начать сет
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
export default WorkoutModal
