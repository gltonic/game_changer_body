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
  Sparkles,
  Sun,
  Volume2
} from 'lucide-react'
import { useWorkoutSession } from '../lib/useWorkoutSession'
import { useWakeLock } from '../lib/useWakeLock'
import { testSoundAlert } from '../lib/soundAlerts'
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

  // Prevent phone screen from turning off during active workout / rest
  const wakeLock = useWakeLock(isOpen && session.status !== 'completed' && session.status !== 'idle')

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 safe-modal-container bg-black/85 backdrop-blur-2xl animate-in fade-in duration-200">
      {/* iOS style modal surface: borderless, solid #1C1C1E */}
      <div className="relative w-full max-w-md bg-[#1C1C1E] rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
        {/* Header Row: Discipline Icon + Title + Close Button */}
        <div className="flex items-start justify-between gap-3 w-full">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="w-12 h-12 rounded-full bg-[#2C2C2E] flex items-center justify-center text-2xl shrink-0">
              {meta.icon}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-xl font-bold text-white tracking-tight truncate">
                  {meta.label}
                </h2>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#2C2C2E] text-[#8E8E93] shrink-0">
                  #{plan.workoutIndex}
                </span>
              </div>
              <p className="text-xs text-[#8E8E93] mt-0.5 truncate">
                5 подходов • {plan.weightKg ? `${plan.weightKg} кг • ` : ''}Отдых {plan.restSeconds}с
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

        {/* Auxiliary Bar: Sound Test & Wake Lock status */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={testSoundAlert}
            title="Проверить громкость и звук таймера"
            className="flex items-center gap-1.5 text-xs font-medium text-white/90 bg-[#2C2C2E] hover:bg-[#3A3A3C] px-3 py-1.5 rounded-full transition-colors active:scale-95 cursor-pointer"
          >
            <Volume2 size={13} className="text-[#0A84FF]" />
            <span>Тест звука</span>
          </button>
          {wakeLock.isLocked && (
            <span
              title="Экран заблокирован от выключения на время тренировки"
              className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20"
            >
              <Sun size={12} className="text-emerald-400" />
              <span>Экран активен</span>
            </span>
          )}
        </div>

        {/* 5 Sets Indicator */}
        <div className="grid grid-cols-5 gap-2 w-full">
          {plan.sets.map((setTarget, idx) => {
            const isCompleted = idx < session.completedSets.length
            const isCurrent = idx === session.currentSetIndex && session.status !== 'completed'
            const actualLogged = session.completedSets[idx]

            return (
              <div
                key={idx}
                className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl transition-all duration-200 ${
                  isCompleted
                    ? 'bg-[#30D158]/15 text-[#30D158]'
                    : isCurrent
                    ? 'bg-white text-black font-bold shadow-md'
                    : 'bg-[#2C2C2E] text-[#8E8E93]'
                }`}
              >
                <span className={`text-[10px] font-semibold ${isCurrent ? 'text-zinc-600' : 'text-[#8E8E93]'}`}>
                  Сет {idx + 1}
                </span>
                <span className="text-sm font-bold mt-0.5 flex items-center gap-0.5">
                  {isCompleted ? (
                    <>
                      <Check size={13} strokeWidth={3} />
                      <span>{actualLogged}</span>
                    </>
                  ) : (
                    setTarget
                  )}
                </span>
                <span className={`text-[9px] ${isCurrent ? 'text-zinc-500' : 'text-[#8E8E93]'}`}>
                  {isTimeBased ? 'сек' : 'повт'}
                </span>
              </div>
            )
          })}
        </div>

        {/* ================= STATE 1: IDLE ================= */}
        {session.status === 'idle' && (
          <div className="flex flex-col items-center justify-center py-8 gap-5 text-center">
            <div className="w-20 h-20 rounded-full bg-[#FF9F0A]/15 text-[#FF9F0A] flex items-center justify-center">
              <Flame size={36} className="fill-[#FF9F0A]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Готовы к тренировке?</h3>
              <p className="text-xs text-[#8E8E93] mt-1.5 max-w-xs leading-relaxed">
                Подход 1 из 5: цель <span className="text-white font-bold">{plan.sets[0]} {isTimeBased ? 'секунд' : 'повторений'}</span>.
                Таймер запустится сразу при нажатии!
              </p>
            </div>
            <button
              onClick={session.startWorkout}
              className="mt-2 w-full py-4 rounded-full bg-white hover:bg-zinc-200 text-black font-bold text-sm tracking-tight flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <Play size={16} fill="currentColor" /> Начать подход 1
            </button>
          </div>
        )}

        {/* ================= STATE 2: IN SET (ACTIVE LIVE TIMER + REPS TRACKER) ================= */}
        {session.status === 'in_set' && (
          <div className="flex flex-col items-center justify-center py-4 gap-5">
            {/* Live Timer Arena (Apple Stopwatch Style) */}
            <div className="relative flex flex-col items-center justify-center w-48 h-48 rounded-full bg-[#2C2C2E]">
              {isTimeBased ? (
                <>
                  <div className="flex items-center gap-1.5 text-[#0A84FF] text-xs font-semibold mb-1">
                    <TimerIcon size={14} className={session.isSetPaused ? '' : 'animate-spin'} />
                    <span>{session.isSetPaused ? 'Пауза' : 'Таймер'}</span>
                  </div>
                  <div className="text-5xl font-bold text-white tracking-tight flex items-baseline">
                    {session.activeSetSeconds}
                    <span className="text-base font-normal text-[#8E8E93] ml-1.5">сек</span>
                  </div>
                  <div className="text-xs text-[#8E8E93] mt-1">
                    Цель: <span className="text-white font-semibold">{currentTarget} сек</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 text-[#0A84FF] text-xs font-semibold mb-1">
                    <Clock size={14} />
                    <span>Секундомер</span>
                  </div>
                  <div className="text-5xl font-bold text-white tracking-tight flex items-baseline">
                    {formatSeconds(session.activeSetSeconds)}
                  </div>
                  <div className="text-xs text-white font-semibold mt-1 bg-[#1C1C1E] px-3 py-1 rounded-full">
                    Цель: {currentTarget} повт
                  </div>
                </>
              )}

              {/* Overperformance Badge */}
              {extraDiff > 0 && (
                <div className="absolute -bottom-3 bg-[#FF9F0A] text-black px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  <Sparkles size={12} /> +{extraDiff} сверх плана
                </div>
              )}
            </div>

            {/* Set Adjuster Controls */}
            <div className="flex flex-col items-center gap-2.5 w-full">
              <span className="text-xs text-[#8E8E93]">
                Фактический результат:
              </span>
              <div className="flex items-center justify-center gap-3 w-full max-w-xs">
                <button
                  type="button"
                  onClick={() => session.adjustActualCount(-1)}
                  className="w-12 h-12 rounded-full bg-[#2C2C2E] hover:bg-[#3A3A3C] text-white flex items-center justify-center transition-colors active:scale-90 cursor-pointer"
                  title="-1"
                >
                  <Minus size={18} />
                </button>

                <div className="flex-1 py-2 px-4 rounded-2xl bg-[#2C2C2E] text-center flex flex-col items-center justify-center">
                  <span className="text-[10px] text-[#8E8E93] font-semibold">Итог</span>
                  <div className="flex items-center justify-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={999}
                      value={currentActual}
                      onChange={(e) => session.setActualCount(parseInt(e.target.value) || 0)}
                      className="w-16 bg-transparent text-2xl font-bold text-white text-center focus:outline-none"
                    />
                    <span className="text-xs text-[#8E8E93]">{isTimeBased ? 'сек' : 'повт'}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => session.adjustActualCount(1)}
                  className="w-12 h-12 rounded-full bg-[#2C2C2E] hover:bg-[#3A3A3C] text-white flex items-center justify-center transition-colors active:scale-90 cursor-pointer"
                  title="+1"
                >
                  <Plus size={18} />
                </button>
              </div>

              {/* Time-based extra pause controls */}
              {isTimeBased && (
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={session.togglePauseSetTimer}
                    className="px-3.5 py-1.5 rounded-full bg-[#2C2C2E] text-xs font-semibold text-white flex items-center gap-1.5"
                  >
                    {session.isSetPaused ? <Play size={12} fill="currentColor" /> : <Pause size={12} fill="currentColor" />}
                    <span>{session.isSetPaused ? 'Продолжить' : 'Пауза'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => session.addSetTime(5)}
                    className="px-3.5 py-1.5 rounded-full bg-[#2C2C2E] text-xs font-semibold text-white flex items-center gap-1"
                  >
                    <Plus size={12} /> +5 сек
                  </button>
                </div>
              )}
            </div>

            {/* Complete Set Button (Solid iOS Green) */}
            <button
              onClick={handleFinishSetClick}
              className="w-full py-4 rounded-full bg-[#30D158] hover:bg-emerald-400 text-black font-bold text-sm tracking-tight flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 mt-1"
            >
              <Check size={18} strokeWidth={3} />
              <span>
                {session.currentSetIndex === 4
                  ? `Завершить всю тренировку (${currentActual} ${isTimeBased ? 'сек' : 'повт'})`
                  : `Зафиксировать сет ${session.currentSetIndex + 1} (${currentActual} ${isTimeBased ? 'сек' : 'повт'})`}
              </span>
            </button>
          </div>
        )}

        {/* ================= STATE 3: RESTING (REST COUNTDOWN TIMER) ================= */}
        {session.status === 'resting' && (
          <div className="flex flex-col items-center justify-center py-5 gap-5">
            {/* Countdown Display */}
            <div className="relative flex flex-col items-center justify-center w-48 h-48 rounded-full bg-[#2C2C2E]">
              <Clock size={22} className="text-[#0A84FF] mb-1" />
              <div
                className={`text-4xl font-bold tracking-tight transition-all duration-200 ${
                  session.remainingRest <= 3 && session.remainingRest > 0 && !session.isRestPaused
                    ? 'text-[#FF9F0A] scale-110 animate-pulse'
                    : 'text-white'
                }`}
              >
                {formatSeconds(session.remainingRest)}
              </div>
              <span className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mt-1">
                {session.isRestPaused ? 'Пауза' : 'Отдых'}
              </span>
            </div>

            <div className="text-xs text-[#8E8E93] text-center bg-[#2C2C2E] px-4 py-2.5 rounded-2xl">
              Следующий подход <span className="text-white font-bold">{session.currentSetIndex + 2} из 5</span>:{' '}
              <span className="text-white font-bold">
                {plan.sets[session.currentSetIndex + 1]} {isTimeBased ? 'сек' : 'повт'}
              </span>
            </div>

            {/* Timer controls */}
            <div className="flex items-center gap-2.5 w-full">
              <button
                onClick={session.togglePauseRest}
                className="flex-1 py-3 rounded-full bg-[#2C2C2E] hover:bg-[#3A3A3C] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {session.isRestPaused ? <Play size={13} fill="currentColor" /> : <Pause size={13} fill="currentColor" />}
                <span>{session.isRestPaused ? 'Продолжить' : 'Пауза'}</span>
              </button>

              <button
                onClick={() => session.addRestTime(30)}
                className="flex-1 py-3 rounded-full bg-[#2C2C2E] hover:bg-[#3A3A3C] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus size={13} /> +30 сек
              </button>

              <button
                onClick={session.skipRest}
                className="flex-1 py-3 rounded-full bg-white hover:bg-zinc-200 text-black text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <SkipForward size={13} /> Начать сет
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
export default WorkoutModal
