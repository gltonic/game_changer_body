import React, { useState, useEffect } from 'react'
import {
  Bell,
  X,
  Check,
  Send,
  AlertCircle,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  RefreshCw,
  Repeat
} from 'lucide-react'
import {
  subscribeToPush,
  sendTestPush,
  getNotificationPermissionStatus,
  fetchScheduledNotifications,
  deleteScheduledNotification,
  schedulePushNotification,
  type ScheduledNotificationItem
} from '../lib/pushClient'

interface NotificationsModalProps {
  isOpen: boolean
  onClose: () => void
  backendUrl: string
  userId: string
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  backendUrl,
  userId
}) => {
  const [permission, setPermission] = useState<string>('default')
  const [isSubscribing, setIsSubscribing] = useState(false)
  const [testSent, setTestSent] = useState(false)
  const [scheduledList, setScheduledList] = useState<ScheduledNotificationItem[]>([])
  const [isLoadingList, setIsLoadingList] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [newTime, setNewTime] = useState('11:00')
  const [isRecurring, setIsRecurring] = useState(true)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const showStatus = (msg: string) => {
    setStatusMessage(msg)
    setTimeout(() => setStatusMessage(null), 4000)
  }

  const loadNotifications = async () => {
    if (!userId || !backendUrl) return
    setIsLoadingList(true)
    try {
      const items = await fetchScheduledNotifications(backendUrl, userId)
      setScheduledList(items)
    } finally {
      setIsLoadingList(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      const perm = getNotificationPermissionStatus()
      setPermission(perm)
      loadNotifications()
      if (perm === 'granted') {
        // Sync subscription to backend in case it was created earlier
        subscribeToPush(backendUrl, userId).catch(() => {})
      }
    }
  }, [isOpen, userId, backendUrl])

  if (!isOpen) return null

  const handleEnablePush = async () => {
    setIsSubscribing(true)
    try {
      const ok = await subscribeToPush(backendUrl, userId)
      setPermission(getNotificationPermissionStatus())
      if (ok) {
        await sendTestPush(backendUrl, userId)
        setTestSent(true)
        showStatus('✓ Push успешно подключен!')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsSubscribing(false)
    }
  }

  const handleSendTest = async () => {
    setTestSent(false)
    try {
      await sendTestPush(backendUrl, userId)
      setTestSent(true)
      setTimeout(() => setTestSent(false), 4000)
    } catch (e) {
      console.error(e)
    }
  }

  const handleAddTime = async () => {
    if (!newTime) return
    setIsSaving(true)
    try {
      const [hours, minutes] = newTime.split(':').map(Number)
      const targetDate = new Date()
      targetDate.setHours(hours, minutes, 0, 0)
      if (targetDate.getTime() <= Date.now()) {
        targetDate.setDate(targetDate.getDate() + 1)
      }

      await schedulePushNotification(backendUrl, {
        userId,
        targetTime: targetDate.toISOString(),
        title: 'Game Changer: Body 🎯',
        body: 'Время для твоей микротренировки! Сохраняй стрик и продолжай путь.',
        payload: {
          recurring: isRecurring,
          time: newTime
        }
      })

      showStatus(`✓ Напоминание на ${newTime} ${isRecurring ? '(ежедневно)' : '(разовое)'} сохранено!`)
      await loadNotifications()
    } catch (e: any) {
      console.error(e)
      showStatus(e?.message || 'Ошибка при сохранении напоминания')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteScheduledNotification(backendUrl, id)
      setScheduledList((prev) => prev.filter((item) => item.id !== id))
      showStatus('Напоминание удалено')
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0a0a0d] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 max-h-[88vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/5 cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#d4af37]/20 to-amber-900/10 border border-[#d4af37]/30 flex items-center justify-center text-2xl shadow-inner text-[#d4af37]">
            <Bell size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-wide">
              Уведомления и Напоминания
            </h2>
            <p className="text-xs text-zinc-400">
              Гибкая настройка расписания тренировок
            </p>
          </div>
        </div>

        {/* Browser Push Status Card */}
        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-zinc-300">
              Статус Push на устройстве:
            </span>
            {permission === 'granted' ? (
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <Check size={12} strokeWidth={3} /> Активны
              </span>
            ) : permission === 'denied' ? (
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                <AlertCircle size={12} /> Заблокированы
              </span>
            ) : (
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Не включены
              </span>
            )}
          </div>

          {permission !== 'granted' ? (
            <button
              onClick={handleEnablePush}
              disabled={isSubscribing}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#d4af37] to-amber-600 hover:from-amber-400 hover:to-amber-600 text-black font-extrabold text-xs tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.35)] transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Sparkles size={14} />
              {isSubscribing ? 'Подключение...' : 'Включить Push-уведомления'}
            </button>
          ) : (
            <button
              onClick={handleSendTest}
              className="w-full py-2.5 rounded-xl bg-zinc-800 border border-white/10 hover:border-[#d4af37]/40 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer hover:bg-zinc-700"
            >
              <Send size={13} className="text-[#d4af37]" />
              Отправить тестовый пуш сейчас
            </button>
          )}

          {testSent && (
            <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <Check size={14} className="stroke-[3]" />
              Тестовый пуш отправлен! Проверь шторку уведомлений.
            </div>
          )}
        </div>

        {/* Schedule Setup Form */}
        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-300">
              <Clock size={14} className="text-[#d4af37]" />
              <span>Добавить напоминание</span>
            </div>
          </div>

          {/* Time Picker & Recurring Arrow Button */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 text-white font-mono text-base focus:outline-none focus:border-[#d4af37]/60"
              />

              <button
                type="button"
                onClick={() => setIsRecurring(!isRecurring)}
                className={`px-3 py-2.5 rounded-xl border flex items-center gap-2 text-xs font-mono transition-all cursor-pointer ${
                  isRecurring
                    ? 'bg-[#d4af37]/15 border-[#d4af37]/50 text-amber-300 shadow-[0_0_12px_rgba(212,175,55,0.2)]'
                    : 'bg-zinc-950 border-white/10 text-zinc-400 hover:text-white'
                }`}
                title="Нажмите, чтобы включить/выключить ежедневное повторение"
              >
                <Repeat
                  size={15}
                  className={`transition-transform duration-300 ${
                    isRecurring ? 'rotate-180 text-[#d4af37]' : 'text-zinc-500'
                  }`}
                />
                <span className="font-semibold">
                  {isRecurring ? 'Регулярно' : 'Разово'}
                </span>
              </button>
            </div>

            <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 px-1">
              <Repeat size={12} className={isRecurring ? 'text-amber-400' : 'text-zinc-600'} />
              {isRecurring
                ? 'Стрелочка активна: пуш будет повторяться каждый день в это время.'
                : 'Разовое напоминание только на сегодня/завтра.'}
            </p>

            <button
              onClick={handleAddTime}
              disabled={isSaving}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#d4af37] to-amber-600 hover:from-amber-400 hover:to-amber-600 text-black font-extrabold text-xs tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shadow-md disabled:opacity-50"
            >
              <Plus size={16} />
              {isSaving ? 'Сохранение...' : `Поставить пуш на ${newTime}`}
            </button>
          </div>

          {/* Status Toast Message */}
          {statusMessage && (
            <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-semibold text-center animate-in fade-in">
              {statusMessage}
            </div>
          )}

          {/* Active Reminders List */}
          <div className="flex flex-col gap-2 pt-3 border-t border-white/5">
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <span>Активные напоминания ({scheduledList.length}):</span>
              <button
                onClick={loadNotifications}
                disabled={isLoadingList}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer p-1"
                title="Обновить список"
              >
                <RefreshCw size={12} className={isLoadingList ? 'animate-spin' : ''} />
              </button>
            </div>

            {scheduledList.length === 0 && !isLoadingList && (
              <div className="text-center py-4 text-xs text-zinc-500">
                Нет активных напоминаний. Задайте время выше!
              </div>
            )}

            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
              {scheduledList.map((item) => {
                const target = new Date(item.target_time)
                const formattedTime = target.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })
                const isItemRecurring = item.payload?.recurring ?? true

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/70 border border-white/5 hover:border-white/15 transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center text-amber-300 font-mono text-xs font-bold shadow-inner">
                        {formattedTime}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-zinc-200">
                            В {formattedTime}
                          </span>
                          {isItemRecurring ? (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                              <Repeat size={9} /> Регулярно
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                              Разовое
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-400 truncate max-w-[180px]">
                          {item.title}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Удалить это напоминание"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotificationsModal
