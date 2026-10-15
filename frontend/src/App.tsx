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
    <div className="flex flex-col min-h-screen bg-[#050505] text-white selection:bg-[#d4af37]/30">
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[90%] bg-zinc-900 border border-[#d4af37]/40 text-white px-4 py-3 rounded-2xl shadow-[0_0_30px_rgba(212,175,55,0.3)] text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top duration-300">
          <Sparkles size={16} className="text-[#d4af37] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-md border-b border-white/5 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#d4af37] to-amber-600 flex items-center justify-center text-black font-black text-sm shadow-[0_0_10px_rgba(212,175,55,0.4)]">
              GC
            </div>
            <div>
              <h1 className="text-xs font-black tracking-widest uppercase text-white">
                Game Changer
              </h1>
              <span className="text-[10px] font-mono font-bold text-[#d4af37] tracking-wider uppercase block -mt-0.5">
                Body • PWA
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {installPrompt && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 border border-[#d4af37]/30 text-[#d4af37] text-xs font-semibold hover:bg-zinc-800 transition-colors"
              >
                <Download size={13} />
                <span>Установить</span>
              </button>
            )}

            <button
              onClick={() => setIsNotificationsOpen(true)}
              className="p-2 rounded-full bg-zinc-900 border border-white/10 hover:border-[#d4af37]/40 text-zinc-300 hover:text-white transition-colors relative"
              title="Центр уведомлений"
            >
              <Bell size={14} className={isPushActive ? 'text-[#d4af37]' : ''} />
              {isPushActive && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              )}
            </button>

            {currentUser ? (
              <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-white/10 rounded-full px-2.5 py-1 text-xs">
                <span className="text-[11px] text-zinc-300 font-mono truncate max-w-[90px]">
                  {currentUser.email?.split('@')[0]}
                </span>
                <button
                  onClick={() => signOut()}
                  className="text-zinc-400 hover:text-red-400 transition-colors ml-0.5"
                  title="Выйти"
                >
                  <LogOut size={13} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-zinc-800 to-zinc-900 border border-white/10 text-xs font-semibold hover:border-[#d4af37]/50 transition-colors"
              >
                <User size={13} className="text-[#d4af37]" />
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
      <main className="flex-1 max-w-md mx-auto w-full px-4 flex flex-col items-center">
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
              setIsOnboardingOpen(true)
            }}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
            onSendTestNotification={handleSendTestPush}
            workoutHistory={workoutHistory}
            isPushActive={isPushActive}
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
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-zinc-900 via-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center text-5xl shadow-[0_0_30px_rgba(212,175,55,0.15)]">
                  {DISCIPLINES_META[currentDiscipline].icon}
                </div>

                <div className="flex flex-col gap-2">
                  <h2 className="text-xl font-black text-white tracking-wide">
                    {DISCIPLINES_META[currentDiscipline].label}
                  </h2>
                  <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                    Тропа еще не рассчитана. Введи свой текущий рекорд и начни стрик!
                  </p>
                </div>

                <button
                  onClick={() => setIsOnboardingOpen(true)}
                  className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#d4af37] to-amber-600 hover:from-amber-400 hover:to-amber-600 text-black font-extrabold text-sm tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(212,175,55,0.4)] transition-all cursor-pointer active:scale-95"
                >
                  <Sparkles size={18} /> Создать тропу прогрессии
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Sticky Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-t border-white/10 py-2.5 px-4">
        <div className="max-w-md mx-auto grid grid-cols-3 gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'text-[#d4af37] bg-white/5 font-bold shadow-[0_0_15px_rgba(212,175,55,0.15)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LayoutDashboard size={20} />
            <span className="text-[10px] font-mono mt-1 tracking-wider uppercase">
              Главная
            </span>
          </button>

          <button
            onClick={() => setActiveTab('trails')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'trails'
                ? 'text-[#d4af37] bg-white/5 font-bold shadow-[0_0_15px_rgba(212,175,55,0.15)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Map size={20} />
            <span className="text-[10px] font-mono mt-1 tracking-wider uppercase">
              Тропы
            </span>
          </button>

          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="flex flex-col items-center justify-center py-1.5 rounded-2xl text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <Bell size={20} />
            <span className="text-[10px] font-mono mt-1 tracking-wider uppercase">
              Уведомления
            </span>
          </button>
        </div>
      </nav>

      {/* Modals */}
      <OnboardingModal
        discipline={currentDiscipline}
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onSaveTrail={handleSaveTrail}
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
