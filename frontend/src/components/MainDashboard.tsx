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
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto py-5 pb-32 animate-in fade-in duration-300">
      {/* 1. Header Hero Card: Streak & Stats (Apple Health Style) */}
      <section className="rounded-3xl bg-[#1C1C1E] p-6 flex flex-col gap-5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-[#FF9F0A]/15 text-[#FF9F0A] flex items-center justify-center">
              <Trophy size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                  ПРОФИЛЬ
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#2C2C2E] text-[#8E8E93] font-medium">
                  {totalCompleted >= 20 ? 'Мастер' : totalCompleted >= 5 ? 'Атлет' : 'Новичок'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">
                Game Changer: Body
              </h2>
            </div>
          </div>

          {/* Streak Counter */}
          <div className="flex items-center gap-2 bg-[#2C2C2E] px-3.5 py-2 rounded-2xl">
            <Flame size={18} className="text-[#FF453A] fill-[#FF453A]" />
            <div className="flex flex-col items-start leading-none">
              <span className="font-bold text-sm text-white">
                {totalStreakDays} {totalStreakDays === 1 ? 'день' : 'дней'}
              </span>
              <span className="text-[10px] text-[#8E8E93] mt-0.5 font-medium">
                Стрик
              </span>
            </div>
          </div>
        </div>

        {/* Summary metric tiles */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-[#2C2C2E] rounded-2xl p-4 flex flex-col">
            <span className="text-xs text-[#8E8E93] font-medium">Закрыто тренировок</span>
            <span className="text-2xl font-bold text-white tracking-tight mt-1">
              {totalCompleted}
            </span>
          </div>
          <div className="bg-[#2C2C2E] rounded-2xl p-4 flex flex-col">
            <span className="text-xs text-[#8E8E93] font-medium">Активных троп</span>
            <span className="text-2xl font-bold text-white tracking-tight mt-1">
              {activeEntries.length} <span className="text-sm font-normal text-[#8E8E93]">/ 5</span>
            </span>
          </div>
        </div>
      </section>

      {/* 2. Notifications Center Banner */}
      <section className="rounded-3xl bg-[#1C1C1E] p-5 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-full bg-[#0A84FF]/15 text-[#0A84FF] flex items-center justify-center">
            <Bell size={20} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-tight">Уведомления</span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isPushActive
                    ? 'bg-[#30D158]/15 text-[#30D158]'
                    : 'bg-[#2C2C2E] text-[#8E8E93]'
                }`}
              >
                {isPushActive ? 'Активны' : 'Отключены'}
              </span>
            </div>
            <span className="text-xs text-[#8E8E93] mt-0.5">
              Напоминания о микротренировках
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onSendTestNotification}
            title="Отправить тестовый пуш"
            className="w-9 h-9 rounded-full bg-[#2C2C2E] hover:bg-[#3A3A3C] text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
          >
            <Send size={15} />
          </button>

          <button
            onClick={onOpenNotifications}
            className="px-4 py-2 rounded-full bg-[#2C2C2E] hover:bg-[#3A3A3C] text-white text-xs font-semibold transition-colors cursor-pointer active:scale-95"
          >
            Настроить
          </button>
        </div>
      </section>

      {/* 3. Active Trails & Streaks Section */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Тропы
            </h3>
            <p className="text-xs text-[#8E8E93] mt-0.5">
              Прогресс по дисциплинам
            </p>
          </div>
          <button
            onClick={() => onOpenCreateTrail()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-black font-semibold text-xs tracking-tight hover:bg-zinc-200 transition-all cursor-pointer active:scale-95"
          >
            <Plus size={15} />
            <span>Новая тропа</span>
          </button>
        </div>

        {activeEntries.length === 0 ? (
          <div className="rounded-3xl bg-[#1C1C1E] p-8 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#2C2C2E] flex items-center justify-center text-3xl">
              🎯
            </div>
            <div>
              <h4 className="text-base font-bold text-white tracking-tight">Нет активных троп</h4>
              <p className="text-xs text-[#8E8E93] mt-1.5 max-w-xs leading-relaxed">
                Создайте свою первую тропу: укажите текущий рекорд и начните серию тренировок.
              </p>
            </div>
            <button
              onClick={() => onOpenCreateTrail()}
              className="px-6 py-3 rounded-2xl bg-white text-black font-semibold text-xs tracking-tight flex items-center gap-2 hover:bg-zinc-200 cursor-pointer active:scale-95 transition-all"
            >
              <Sparkles size={16} /> Создать первую тропу
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
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
                  className="rounded-3xl bg-[#1C1C1E] p-6 flex flex-col gap-5 transition-all"
                >
                  {/* Top card row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-full bg-[#2C2C2E] flex items-center justify-center text-2xl">
                        {meta.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-white tracking-tight">{meta.label}</h4>
                          {data.weight_kg && (
                            <span className="text-[11px] font-medium text-[#8E8E93] flex items-center gap-1 bg-[#2C2C2E] px-2 py-0.5 rounded-full">
                              <Dumbbell size={11} className="text-[#FF9F0A]" />
                              {data.weight_kg} кг
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-[#8E8E93] font-medium mt-0.5 block">
                          Тренировка {Math.min(currentIdx + 1, total)} из {total} ({pct}%)
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onOpenTrailView(disc)}
                      className="px-3.5 py-1.5 rounded-full bg-[#2C2C2E] hover:bg-[#3A3A3C] text-white transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                      title="Открыть карту тропы"
                    >
                      <Map size={14} className="text-[#0A84FF]" />
                      <span>Карта</span>
                    </button>
                  </div>

                  {/* Activity Progress Bar (Solid iOS Health style) */}
                  <div className="w-full bg-[#2C2C2E] h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#FF9F0A] h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Next workout preview and action */}
                  {nextWorkout && !isCompletedAll ? (
                    <div className="flex items-center justify-between bg-[#2C2C2E] rounded-2xl p-4">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">
                          Следующая тренировка #{nextWorkout.workoutIndex}
                        </span>
                        <div className="flex items-center gap-1.5 mt-1 text-sm font-bold text-white">
                          <span>5 подходов:</span>
                          <span className="text-[#FF9F0A]">
                            {nextWorkout.sets.join('-')} {nextWorkout.unit === 'seconds' ? 'сек' : 'повт'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => onStartWorkout(nextWorkout)}
                        className="px-5 py-2.5 rounded-full bg-white hover:bg-zinc-200 text-black font-bold text-xs tracking-tight flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      >
                        <Play size={13} fill="currentColor" />
                        <span>Начать</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-[#2C2C2E] rounded-2xl p-4 text-[#30D158] text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={18} />
                        <span>Тропа полностью завершена!</span>
                      </div>
                      <button
                        onClick={() => onOpenCreateTrail(disc)}
                        className="px-3.5 py-1.5 rounded-full bg-[#30D158]/15 text-[#30D158] hover:bg-[#30D158]/25 text-xs font-semibold transition-colors"
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
          <h3 className="text-xl font-bold text-white tracking-tight px-1">
            Недавние тренировки
          </h3>
          <div className="flex flex-col gap-2.5">
            {workoutHistory.slice(0, 4).map((item, idx) => {
              const meta = DISCIPLINES_META[item.discipline as Discipline]
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-[#1C1C1E] p-4 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#2C2C2E] flex items-center justify-center text-lg">
                      {meta?.icon || '⚡'}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-white text-sm">{meta?.label || item.discipline}</span>
                      <span className="text-xs text-[#8E8E93] mt-0.5">
                        {item.completed_at ? new Date(item.completed_at).toLocaleDateString() : 'Сегодня'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-white font-bold text-sm">
                      {Array.isArray(item.completed_sets) ? item.completed_sets.join('-') : ''}
                    </span>
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#2C2C2E] text-[#8E8E93] font-medium">
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
