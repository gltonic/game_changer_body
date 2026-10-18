import { useState, useEffect } from 'react'
import {
  Sparkles,
  User,
  LogOut,
  Download,
  LayoutDashboard,
  Map,
  Bell
} from 'lucide-react'
import { DisciplineBar, DISCIPLINES_META } from './components/DisciplineBar'
import { OnboardingModal } from './components/OnboardingModal'
import { TrailView } from './components/TrailView'
import { WorkoutModal } from './components/WorkoutModal'
import { FeedbackAndScheduleModal } from './components/FeedbackAndScheduleModal'
import { NotificationsModal } from './components/NotificationsModal'
import { AuthModal } from './components/AuthModal'
import { MainDashboard, type DisciplineData } from './components/MainDashboard'
import { supabase } from './lib/supabase'
import { getCurrentUser, signOut } from './lib/auth'
import {
  applyWorkoutAdaptiveProgression,
  type Discipline,
  type WorkoutSessionPlan,
  type WorkoutFeedback
} from './lib/progression'
import {
  subscribeToPush,
  schedulePushNotification,
  sendTestPush,
  getNotificationPermissionStatus
} from './lib/pushClient'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

type ActiveTab = 'dashboard' | 'trails'

export function App() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard')
  const [currentDiscipline, setCurrentDiscipline] = useState<Discipline>('pullups')

  // Storage of disciplines: discipline -> DisciplineData
  const [userDisciplines, setUserDisciplines] = useState<Record<string, DisciplineData>>(() => {
    try {
      const saved = localStorage.getItem('gc_body_disciplines')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  // Workout history log
  const [workoutHistory, setWorkoutHistory] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('gc_body_history')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Modals state
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false)
  const [editingTrailData, setEditingTrailData] = useState<{
    max_baseline?: number
    total_workouts?: number
    weight_kg?: number
  } | undefined>(undefined)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [activeWorkout, setActiveWorkout] = useState<WorkoutSessionPlan | null>(null)
  const [finishedWorkoutPlan, setFinishedWorkoutPlan] = useState<WorkoutSessionPlan | null>(null)
  const [lastCompletedSets, setLastCompletedSets] = useState<number[]>([])
  const [isFinishingWorkout, setIsFinishingWorkout] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isPushActive, setIsPushActive] = useState<boolean>(false)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const handleDeleteTrail = async (discipline: Discipline) => {
    setUserDisciplines((prev) => {
      const copy = { ...prev }
      delete copy[discipline]
      localStorage.setItem('gc_body_disciplines', JSON.stringify(copy))
      return copy
    })
    showToast(`✓ Тропа «${DISCIPLINES_META[discipline].label}» удалена`)

    if (currentUser?.id) {
      try {
        await supabase
          .from('user_disciplines')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('discipline', discipline)
      } catch (err) {
        console.error('Failed deleting trail from Supabase:', err)
      }
    }
  }

  const handleEditTrail = (discipline: Discipline) => {
    const existing = userDisciplines[discipline]
    if (existing) {
      setEditingTrailData({
        max_baseline: existing.max_baseline,
        total_workouts: existing.total_workouts,
        weight_kg: existing.weight_kg
      })
    } else {
      setEditingTrailData(undefined)
    }
    setCurrentDiscipline(discipline)
    setIsOnboardingOpen(true)
  }

  const handleResetTrail = async (discipline: Discipline) => {
    const existing = userDisciplines[discipline]
    if (!existing) return

    const updated: DisciplineData = {
      ...existing,
      current_workout_index: 0
    }

    setUserDisciplines((prev) => {
      const copy = { ...prev, [discipline]: updated }
      localStorage.setItem('gc_body_disciplines', JSON.stringify(copy))
      return copy
    })

    showToast(`✓ Прогресс тропы «${DISCIPLINES_META[discipline].label}» сброшен к началу`)

    if (currentUser?.id) {
      try {
        await supabase
          .from('user_disciplines')
          .update({ current_workout_index: 0, updated_at: new Date().toISOString() })
          .eq('user_id', currentUser.id)
          .eq('discipline', discipline)
      } catch (err) {
        console.error('Failed resetting trail progress in Supabase:', err)
      }
    }
  }

  // Check push permission on mount
  useEffect(() => {
    setIsPushActive(getNotificationPermissionStatus() === 'granted')
  }, [isNotificationsOpen])

  // Listen for PWA beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  // Check Supabase auth state on load
  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        if (user) {
          setCurrentUser(user)
          fetchUserDisciplines(user.id)
          fetchWorkoutHistory(user.id)
        }
      })
      .catch(() => {})

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser(session.user)
        fetchUserDisciplines(session.user.id)
        fetchWorkoutHistory(session.user.id)
      } else {
        setCurrentUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Save disciplines & history to localStorage as backup
  useEffect(() => {
    try {
      localStorage.setItem('gc_body_disciplines', JSON.stringify(userDisciplines))
    } catch (e) {
      console.error('Failed saving to localStorage', e)
    }
  }, [userDisciplines])

  useEffect(() => {
    try {
      localStorage.setItem('gc_body_history', JSON.stringify(workoutHistory))
    } catch (e) {
      console.error('Failed saving history to localStorage', e)
    }
  }, [workoutHistory])

  const fetchUserDisciplines = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_disciplines')
        .select('*')
        .eq('user_id', userId)

      if (!error && data && data.length > 0) {
        const mapped: Record<string, DisciplineData> = {}
        for (const item of data) {
          mapped[item.discipline] = {
            max_baseline: item.max_baseline,
            weight_kg: item.weight_kg,
            total_workouts: item.total_workouts,
            current_workout_index: item.current_workout_index,
            trail_data: item.trail_data
          }
        }
        setUserDisciplines((prev) => ({ ...prev, ...mapped }))
      }
    } catch (err) {
      console.error('Error fetching disciplines from Supabase:', err)
    }
  }

  const fetchWorkoutHistory = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('workout_history')
        .select('*')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(20)

      if (!error && data) {
        setWorkoutHistory(data)
      }
    } catch (err) {
      console.error('Error fetching workout history:', err)
    }
  }

  const handleSaveTrail = async (
    discipline: Discipline,
    trail: WorkoutSessionPlan[],
    maxBaseline: number,
    totalWorkouts: number,
    weightKg?: number
  ) => {
    const data: DisciplineData = {
      max_baseline: maxBaseline,
      weight_kg: weightKg,
      total_workouts: totalWorkouts,
      current_workout_index: 0,
      trail_data: trail
    }

    setUserDisciplines((prev) => ({
      ...prev,
      [discipline]: data
    }))
    setCurrentDiscipline(discipline)
    setIsOnboardingOpen(false)
    showToast(`✓ Тропа для «${DISCIPLINES_META[discipline].label}» рассчитана!`)

    // Sync to Supabase if authenticated
    if (currentUser?.id) {
      try {
        await supabase.from('user_disciplines').upsert(
          {
            user_id: currentUser.id,
            discipline,
            max_baseline: maxBaseline,
            weight_kg: weightKg,
            total_workouts: totalWorkouts,
            current_workout_index: 0,
            trail_data: trail,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id,discipline' }
        )
      } catch (err) {
        console.error('Failed syncing to Supabase:', err)
      }
    }
  }

  const handleStartWorkout = (workout: WorkoutSessionPlan) => {
    setActiveWorkout(workout)
  }

  const handleWorkoutCompleted = (completedSets: number[]) => {
    setFinishedWorkoutPlan(activeWorkout)
    setLastCompletedSets(completedSets)
    setActiveWorkout(null)
    setIsFinishingWorkout(true)
  }

  const handleSaveFeedbackAndSchedule = async (
    feedback: WorkoutFeedback,
    nextWorkoutDate?: string
  ) => {
    const workoutDiscipline = finishedWorkoutPlan?.discipline || currentDiscipline
    const currentData = userDisciplines[workoutDiscipline]
    if (!currentData) return

    // Adaptive progression calculation based on feedback AND actual completed reps!
    const { updatedTrail, extraCount, adaptedMessage } = applyWorkoutAdaptiveProgression(
      currentData.trail_data,
      currentData.current_workout_index,
      lastCompletedSets,
      feedback
    )

    const nextIndex = Math.min(
      currentData.current_workout_index + 1,
      currentData.total_workouts
    )

    const updatedData: DisciplineData = {
      ...currentData,
      current_workout_index: nextIndex,
      trail_data: updatedTrail
    }

    setUserDisciplines((prev) => ({
      ...prev,
      [workoutDiscipline]: updatedData
    }))
    setIsFinishingWorkout(false)

    // Append to local history
    const historyItem = {
      discipline: workoutDiscipline,
      workout_index: currentData.current_workout_index + 1,
      completed_sets: lastCompletedSets,
      feedback,
      completed_at: new Date().toISOString()
    }
    setWorkoutHistory((prev) => [historyItem, ...prev])

    if (adaptedMessage) {
      showToast(adaptedMessage)
    } else if (extraCount > 0) {
      showToast(`🔥 Перевыполнение на +${extraCount}! Программа адаптирована.`)
    } else {
      showToast('✓ Тренировка успешно зафиксирована!')
    }

    const userId = currentUser?.id || 'local_user'

    // Schedule Push Notification if requested
    if (nextWorkoutDate) {
      try {
        await subscribeToPush(BACKEND_URL, userId)
        await schedulePushNotification(BACKEND_URL, {
          userId,
          targetTime: nextWorkoutDate,
          title: 'Game Changer: Body 🎯',
          body: `Время для ${DISCIPLINES_META[workoutDiscipline].label}! Тренировка #${nextIndex + 1} ждет.`
        })
      } catch (pushErr) {
        console.warn('Could not schedule push notification:', pushErr)
      }
    }

    // Save to Supabase
    if (currentUser?.id) {
      try {
        await supabase.from('user_disciplines').upsert({
          user_id: currentUser.id,
          discipline: workoutDiscipline,
          max_baseline: currentData.max_baseline,
          weight_kg: currentData.weight_kg,
          total_workouts: currentData.total_workouts,
          current_workout_index: nextIndex,
          trail_data: updatedTrail,
          updated_at: new Date().toISOString()
        })

        await supabase.from('workout_history').insert({
          user_id: currentUser.id,
          discipline: workoutDiscipline,
          workout_index: currentData.current_workout_index + 1,
          completed_sets: lastCompletedSets,
          feedback,
          completed_at: new Date().toISOString()
        })
      } catch (err) {
        console.error('Failed saving workout result to Supabase:', err)
      }
    }
  }

  const handleSendTestPush = async () => {
    const userId = currentUser?.id || 'local_user'
    try {
      await sendTestPush(BACKEND_URL, userId)
      showToast('🔔 Тестовый пуш отправлен на устройство!')
    } catch (e) {
      showToast('Включи уведомления в центре настроек')
      setIsNotificationsOpen(true)
    }
  }

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === 'accepted') {
        setInstallPrompt(null)
      }
    }
  }

  const currentProgram = userDisciplines[currentDiscipline]

  return (
    <div className="flex flex-col min-h-screen bg-black text-white selection:bg-white/20">
      {/* Toast popup (iOS style notification banner) */}
      {toastMessage && (
        <div className="fixed top-[max(1rem,calc(env(safe-area-inset-top)+0.5rem))] left-1/2 -translate-x-1/2 z-50 max-w-sm w-[90%] bg-[#1C1C1E] text-white px-4 py-3 rounded-2xl shadow-2xl text-xs font-semibold flex items-center gap-2.5 animate-in slide-in-from-top duration-300">
          <Sparkles size={16} className="text-[#FF9F0A] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header with iOS Safe Area support */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/5 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-[#1C1C1E] flex items-center justify-center text-white font-bold text-xs tracking-tight">
              GC
            </div>
            <div>
              <h1 className="text-xs font-bold tracking-tight uppercase text-white">
                Game Changer
              </h1>
              <span className="text-[10px] text-[#8E8E93] tracking-wide uppercase block -mt-0.5 font-medium">
                Body
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {installPrompt && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1C1C1E] hover:bg-[#2C2C2E] text-white text-xs font-semibold transition-colors"
              >
                <Download size={13} />
                <span>Установить</span>
              </button>
            )}

            <button
              onClick={() => setIsNotificationsOpen(true)}
              className="p-2.5 rounded-full bg-[#1C1C1E] hover:bg-[#2C2C2E] text-white transition-colors relative"
              title="Центр уведомлений"
            >
              <Bell size={15} className={isPushActive ? 'text-[#0A84FF]' : 'text-[#8E8E93]'} />
              {isPushActive && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#30D158] rounded-full" />
              )}
            </button>

            {currentUser ? (
              <div className="flex items-center gap-1.5 bg-[#1C1C1E] rounded-full px-3 py-1.5 text-xs">
                <span className="text-[11px] text-[#8E8E93] font-medium truncate max-w-[90px]">
                  {currentUser.email?.split('@')[0]}
                </span>
                <button
                  onClick={() => signOut()}
                  className="text-[#8E8E93] hover:text-[#FF453A] transition-colors ml-0.5"
                  title="Выйти"
                >
                  <LogOut size={13} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1C1C1E] hover:bg-[#2C2C2E] text-white text-xs font-semibold transition-colors"
              >
                <User size={13} className="text-[#8E8E93]" />
                <span>Войти</span>
              </button>
            )}
          </div>
        </div>

        {/* In Trails Tab: Horizontal Discipline Switch */}
        {activeTab === 'trails' && (
          <div className="max-w-md mx-auto mt-2">
            <DisciplineBar
              currentDiscipline={currentDiscipline}
              onSelect={setCurrentDiscipline}
              userDisciplines={userDisciplines}
            />
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 flex flex-col items-center pb-[calc(5rem+env(safe-area-inset-bottom))]">
        {activeTab === 'dashboard' ? (
          <MainDashboard
            userDisciplines={userDisciplines}
            activeDiscipline={currentDiscipline}
            onSelectDiscipline={setCurrentDiscipline}
            onOpenTrailView={(disc) => {
              setCurrentDiscipline(disc)
              setActiveTab('trails')
            }}
            onStartWorkout={handleStartWorkout}
            onOpenCreateTrail={(disc) => {
              if (disc) setCurrentDiscipline(disc)
              setEditingTrailData(undefined)
              setIsOnboardingOpen(true)
            }}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
            onSendTestNotification={handleSendTestPush}
            workoutHistory={workoutHistory}
            isPushActive={isPushActive}
            onDeleteTrail={handleDeleteTrail}
            onEditTrail={handleEditTrail}
            onResetTrail={handleResetTrail}
          />
        ) : (
          <div className="w-full flex flex-col items-center">
            {currentProgram && currentProgram.trail_data.length > 0 ? (
              <TrailView
                trail={currentProgram.trail_data}
                currentWorkoutIndex={currentProgram.current_workout_index}
                onStartWorkout={handleStartWorkout}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-center gap-6 animate-in fade-in duration-300">
                <div className="w-24 h-24 rounded-full bg-[#1C1C1E] flex items-center justify-center text-5xl">
                  {DISCIPLINES_META[currentDiscipline].icon}
                </div>

                <div className="flex flex-col gap-2">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    {DISCIPLINES_META[currentDiscipline].label}
                  </h2>
                  <p className="text-xs text-[#8E8E93] max-w-xs leading-relaxed">
                    Тропа еще не рассчитана. Введите свой текущий рекорд и начните стрик!
                  </p>
                </div>

                <button
                  onClick={() => {
                    setEditingTrailData(undefined)
                    setIsOnboardingOpen(true)
                  }}
                  className="px-8 py-4 rounded-full bg-white hover:bg-zinc-200 text-black font-bold text-sm tracking-tight flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                >
                  <Sparkles size={18} /> Создать тропу прогрессии
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Sticky Navigation Bar with iOS Safe Area support */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-black/85 backdrop-blur-2xl border-t border-white/5 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-md mx-auto grid grid-cols-3 gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center py-2 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'text-white bg-[#1C1C1E] font-semibold'
                : 'text-[#8E8E93] hover:text-white'
            }`}
          >
            <LayoutDashboard size={20} />
            <span className="text-[11px] mt-1 font-medium tracking-tight">
              Главная
            </span>
          </button>

          <button
            onClick={() => setActiveTab('trails')}
            className={`flex flex-col items-center justify-center py-2 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'trails'
                ? 'text-white bg-[#1C1C1E] font-semibold'
                : 'text-[#8E8E93] hover:text-white'
            }`}
          >
            <Map size={20} />
            <span className="text-[11px] mt-1 font-medium tracking-tight">
              Тропы
            </span>
          </button>

          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="flex flex-col items-center justify-center py-2 rounded-2xl text-[#8E8E93] hover:text-white transition-all cursor-pointer"
          >
            <Bell size={20} />
            <span className="text-[11px] mt-1 font-medium tracking-tight">
              Уведомления
            </span>
          </button>
        </div>
      </nav>

      {/* Modals */}
      <OnboardingModal
        discipline={currentDiscipline}
        isOpen={isOnboardingOpen}
        onClose={() => {
          setIsOnboardingOpen(false)
          setEditingTrailData(undefined)
        }}
        onSaveTrail={handleSaveTrail}
        initialData={editingTrailData}
      />

      {activeWorkout && (
        <WorkoutModal
          plan={activeWorkout}
          isOpen={!!activeWorkout}
          onClose={() => setActiveWorkout(null)}
          onFinishWorkout={handleWorkoutCompleted}
        />
      )}

      <FeedbackAndScheduleModal
        isOpen={isFinishingWorkout}
        onClose={() => setIsFinishingWorkout(false)}
        onSave={handleSaveFeedbackAndSchedule}
        completedSets={lastCompletedSets}
        plan={finishedWorkoutPlan || undefined}
      />

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        backendUrl={BACKEND_URL}
        userId={currentUser?.id || 'local_user'}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user)
          fetchUserDisciplines(user.id)
          fetchWorkoutHistory(user.id)
        }}
      />
    </div>
  )
}

export default App
