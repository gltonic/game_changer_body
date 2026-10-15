import React from 'react'
import {
  Flame,
  Trophy,
  Plus,
  Play,
  Map,
  Bell,
  CheckCircle2,
  Sparkles,
  Send,
  Dumbbell
} from 'lucide-react'
import { DISCIPLINES_META } from './DisciplineBar'
import type { Discipline, WorkoutSessionPlan } from '../lib/progression'

export interface DisciplineData {
  max_baseline: number
  weight_kg?: number
  total_workouts: number
  current_workout_index: number
  trail_data: WorkoutSessionPlan[]
}

interface MainDashboardProps {
  userDisciplines: Record<string, DisciplineData>
  activeDiscipline: Discipline
  onSelectDiscipline: (d: Discipline) => void
  onOpenTrailView: (d: Discipline) => void
  onStartWorkout: (workout: WorkoutSessionPlan) => void
  onOpenCreateTrail: (d?: Discipline) => void
  onOpenNotifications: () => void
  onSendTestNotification: () => void
  workoutHistory?: any[]
  isPushActive: boolean
}

export const MainDashboard: React.FC<MainDashboardProps> = ({
  userDisciplines,
  onOpenTrailView,
  onStartWorkout,
  onOpenCreateTrail,
  onOpenNotifications,
  onSendTestNotification,
  workoutHistory = [],
  isPushActive
}) => {
  const activeEntries = Object.entries(userDisciplines).filter(
    ([, data]) => data && data.trail_data && data.trail_data.length > 0
  )

  // Overall statistics
  const totalCompleted = activeEntries.reduce(
    (acc, [, data]) => acc + data.current_workout_index,
    0
  )

  // Calculate dynamic streak based on completed workouts
  const totalStreakDays = totalCompleted > 0 ? Math.min(totalCompleted + 1, 14) : 0

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto py-4 pb-28 animate-in fade-in duration-300">
      {/* 1. Header Hero Card: Streak & Stats */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border border-white/10 p-5 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
        <div className="absolute top-0 right-0 w-44 h-44 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex justify-between items-center relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#d4af37]/15 border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.3)]">
              <Trophy size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#d4af37]">
                  ПРОФИЛЬ
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 font-semibold">
                  {totalCompleted >= 20 ? 'Мастер силы' : totalCompleted >= 5 ? 'Атлет' : 'Новичок'}
                </span>
              </div>
              <h2 className="text-base font-extrabold text-white mt-0.5">
                Game Changer: Body
              </h2>
            </div>
          </div>

          {/* Streak Counter */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-orange-500/40 px-3 py-1 rounded-2xl shadow-[0_0_15px_rgba(249,115,22,0.25)]">
              <Flame size={16} className="text-orange-400 fill-orange-400 animate-pulse" />
              <span className="font-mono font-black text-sm text-white">
                {totalStreakDays} {totalStreakDays === 1 ? 'день' : 'дней'}
              </span>
            </div>
            <span className="text-[9px] font-mono text-zinc-400 mt-1 uppercase tracking-wider">
              Текущий стрик
            </span>
          </div>
        </div>

        {/* Quick summary counters */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/5">
          <div className="bg-zinc-900/60 rounded-xl p-2.5 border border-white/5 flex flex-col">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">Закрыто тренировок</span>
            <span className="text-xl font-mono font-black text-[#d4af37] mt-0.5">
              {totalCompleted}
            </span>
          </div>
          <div className="bg-zinc-900/60 rounded-xl p-2.5 border border-white/5 flex flex-col">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">Активных троп</span>
            <span className="text-xl font-mono font-black text-white mt-0.5">
              {activeEntries.length} / 5
            </span>
          </div>
        </div>
      </section>

      {/* 2. Notifications Quick Center Banner */}
      <section className="rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-white/10 p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37]">
            <Bell size={18} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Push-Уведомления</span>
              <span
                className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                  isPushActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {isPushActive ? 'АКТИВНЫ' : 'НЕ ВКЛЮЧЕНЫ'}
              </span>
            </div>
            <span className="text-[11px] text-zinc-400 mt-0.5">
              Персональные напоминания о микротренировках
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onSendTestNotification}
            title="Отправить тестовый пуш"
            className="p-2 rounded-xl bg-zinc-800 border border-white/10 hover:border-[#d4af37]/40 text-[#d4af37] transition-all cursor-pointer active:scale-95"
          >
            <Send size={15} />
          </button>
          <button
            onClick={onOpenNotifications}
            className="px-3 py-1.5 rounded-xl bg-[#d4af37]/15 hover:bg-[#d4af37]/25 border border-[#d4af37]/30 text-[#d4af37] text-xs font-bold transition-all cursor-pointer"
          >
            Настроить
          </button>
        </div>
      </section>

      {/* 3. Active Trails & Streaks Section */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">
              Тропы и Стрики
            </h3>
            <p className="text-[11px] text-zinc-400">
              Твой параллельный прогресс по дисциплинам
            </p>
          </div>
          <button
            onClick={() => onOpenCreateTrail()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-amber-600 hover:from-amber-400 hover:to-amber-600 text-black font-extrabold text-xs shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all cursor-pointer active:scale-95"
          >
            <Plus size={14} />
            <span>Новая тропа</span>
          </button>
        </div>

        {activeEntries.length === 0 ? (
          <div className="rounded-3xl bg-zinc-950 border border-white/10 p-8 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-3xl">
              🎯
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Нет активных троп</h4>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                Создай свою первую тропу: укажи свой текущий рекорд и начни серию тренировок.
              </p>
            </div>
            <button
              onClick={() => onOpenCreateTrail()}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#d4af37] to-amber-600 text-black font-black text-xs tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.4)] cursor-pointer active:scale-95"
            >
              <Sparkles size={16} /> Создать первую тропу
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {activeEntries.map(([discKey, data]) => {
              const disc = discKey as Discipline
              const meta = DISCIPLINES_META[disc]
              const currentIdx = data.current_workout_index
              const total = data.total_workouts
              const pct = Math.min(100, Math.round((currentIdx / total) * 100))
              const nextWorkout = data.trail_data[currentIdx] || data.trail_data[total - 1]
              const isCompletedAll = currentIdx >= total

              return (
                <div
                  key={discKey}
                  className="rounded-3xl bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-white/10 p-5 shadow-lg flex flex-col gap-4 hover:border-white/20 transition-all"
                >
                  {/* Top card row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-white/10 flex items-center justify-center text-2xl shadow-inner">
                        {meta.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white">{meta.label}</h4>
                          {data.weight_kg && (
                            <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-0.5">
                              <Dumbbell size={10} className="text-[#d4af37]" />
                              {data.weight_kg} кг
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-[#d4af37] font-semibold">
                          Тренировка {Math.min(currentIdx + 1, total)} из {total} ({pct}%)
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onOpenTrailView(disc)}
                      className="p-2 rounded-xl bg-zinc-800/80 border border-white/10 text-zinc-300 hover:text-white hover:border-[#d4af37]/40 transition-colors flex items-center gap-1 text-xs font-mono"
                      title="Открыть карту тропы"
                    >
                      <Map size={14} className="text-[#d4af37]" />
                      <span className="text-[11px]">Карта</span>
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex flex-col gap-1.5">
                    <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden p-0.5">
                      <div
                        className="bg-gradient-to-r from-amber-600 to-[#d4af37] h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(212,175,55,0.5)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Next workout preview and actions */}
                  {nextWorkout && !isCompletedAll ? (
                    <div className="flex items-center justify-between bg-zinc-950/80 rounded-2xl p-3 border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-mono text-zinc-400 uppercase">
                          Следующая тренировка #{nextWorkout.workoutIndex}
                        </span>
                        <div className="flex items-center gap-1 mt-0.5 text-xs font-mono font-bold text-white">
                          <span>5 подходов:</span>
                          <span className="text-[#d4af37]">
                            {nextWorkout.sets.join('-')} {nextWorkout.unit === 'seconds' ? 'сек' : 'повт'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => onStartWorkout(nextWorkout)}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-amber-600 hover:from-amber-400 hover:to-amber-600 text-black font-black text-xs tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(212,175,55,0.35)] transition-all cursor-pointer active:scale-95"
                      >
                        <Play size={14} fill="currentColor" />
                        <span>Начать</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-emerald-950/30 rounded-2xl p-3 border border-emerald-500/20 text-emerald-300 text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        <span>Тропа полностью завершена!</span>
                      </div>
                      <button
                        onClick={() => onOpenCreateTrail(disc)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-bold"
                      >
                        Новый цикл
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 4. Workout History Log Section */}
      {workoutHistory && workoutHistory.length > 0 && (
        <section className="flex flex-col gap-3 pt-2">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-white px-1">
            Недавние тренировки
          </h3>
          <div className="flex flex-col gap-2">
            {workoutHistory.slice(0, 4).map((item, idx) => {
              const meta = DISCIPLINES_META[item.discipline as Discipline]
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-zinc-900/60 border border-white/5 p-3 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{meta?.icon || '⚡'}</span>
                    <div className="flex flex-col">
                      <span className="font-bold text-white">{meta?.label || item.discipline}</span>
                      <span className="text-[10px] text-zinc-400">
                        {item.completed_at ? new Date(item.completed_at).toLocaleDateString() : 'Сегодня'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[#d4af37] font-bold">
                      {Array.isArray(item.completed_sets) ? item.completed_sets.join('-') : ''}
                    </span>
                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      {item.feedback === 'easy' ? 'Легко' : item.feedback === 'death' ? 'Смерть' : 'Норм'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
export default MainDashboard
