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
  Repeat,
  Volume2
} from 'lucide-react'
import { testSoundAlert } from '../lib/soundAlerts'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] bg-black/85 backdrop-blur-2xl animate-in fade-in duration-200">
      {/* iOS style modal surface: borderless, solid #1C1C1E, generous padding */}
      <div className="relative w-full max-w-md bg-[#1C1C1E] rounded-3xl p-6 shadow-2xl flex flex-col gap-5 max-h-[88vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#8E8E93] hover:text-white transition-colors p-2 rounded-full hover:bg-[#2C2C2E] cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#0A84FF]/15 text-[#0A84FF] flex items-center justify-center">
            <Bell size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Уведомления
            </h2>
            <p className="text-xs text-[#8E8E93] mt-0.5">
              Расписание и напоминания
            </p>
          </div>
        </div>

        {/* Device Push Status Section */}
        <div className="p-4 rounded-2xl bg-[#2C2C2E] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8E8E93]">
              Статус на устройстве:
            </span>
            {permission === 'granted' ? (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#30D158]/15 text-[#30D158] flex items-center gap-1">
                <Check size={12} strokeWidth={3} /> Активны
              </span>
            ) : permission === 'denied' ? (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FF453A]/15 text-[#FF453A] flex items-center gap-1">
                <AlertCircle size={12} /> Заблокированы
              </span>
            ) : (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#3A3A3C] text-[#8E8E93]">
                Не включены
              </span>
            )}
          </div>

          {permission !== 'granted' ? (
            <button
              onClick={handleEnablePush}
              disabled={isSubscribing}
              className="w-full py-3 rounded-2xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs tracking-tight flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Sparkles size={14} />
              {isSubscribing ? 'Подключение...' : 'Включить Push-уведомления'}
            </button>
          ) : (
            <button
              onClick={handleSendTest}
              className="w-full py-2.5 rounded-2xl bg-[#3A3A3C] hover:bg-[#48484A] text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Send size={14} className="text-[#0A84FF]" />
              <span>Отправить тестовый пуш сейчас</span>
            </button>
          )}

          {testSent && (
            <div className="p-3 rounded-2xl bg-[#30D158]/15 text-[#30D158] text-xs font-medium flex items-center gap-2 animate-in fade-in">
              <Check size={14} strokeWidth={2.5} />
              <span>Тестовый пуш отправлен на экран блокировки!</span>
            </div>
          )}
        </div>

        {/* Timer Sound Test Section */}
        <div className="p-4 rounded-2xl bg-[#2C2C2E] flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 size={15} className="text-[#0A84FF]" />
              <span className="text-xs font-semibold text-white">Звуковой сигнал таймера</span>
            </div>
            <span className="text-[11px] text-[#30D158] font-semibold">Web Audio + WAV</span>
          </div>
          <p className="text-[11px] text-[#8E8E93] leading-relaxed">
            Сигнал окончания отдыха между подходами. На iPhone убедитесь, что боковой рычажок не стоит в режиме «Без звука».
          </p>
          <button
            type="button"
            onClick={testSoundAlert}
            className="w-full py-2.5 rounded-2xl bg-[#3A3A3C] hover:bg-[#48484A] text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-95"
          >
            <Volume2 size={14} className="text-[#0A84FF]" />
            <span>Протестировать звук гонга</span>
          </button>
        </div>

        {/* Add Reminder Card */}
        <div className="p-5 rounded-2xl bg-[#2C2C2E] flex flex-col gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">
            <Clock size={14} className="text-[#0A84FF]" />
            <span>Новое напоминание</span>
          </div>

          {/* Time Picker & Recurring Switch */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="flex-1 bg-[#1C1C1E] rounded-2xl px-4 py-3 text-white text-lg font-bold focus:outline-none"
              />

              <button
                type="button"
                onClick={() => setIsRecurring(!isRecurring)}
                className={`px-4 py-3 rounded-2xl flex items-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
                  isRecurring
                    ? 'bg-white text-black'
                    : 'bg-[#1C1C1E] text-[#8E8E93] hover:text-white'
                }`}
                title="Переключить ежедневное повторение"
              >
                <Repeat
                  size={15}
                  className={`transition-transform duration-300 ${
                    isRecurring ? 'rotate-180 text-black' : 'text-[#8E8E93]'
                  }`}
                />
                <span>{isRecurring ? 'Регулярно' : 'Разово'}</span>
              </button>
            </div>

            <p className="text-xs text-[#8E8E93] px-1">
              {isRecurring
                ? '🔁 Напоминание будет повторяться каждый день в это время.'
                : '📅 Однократное напоминание только на сегодня/завтра.'}
            </p>

            <button
              onClick={handleAddTime}
              disabled={isSaving}
              className="w-full py-3 rounded-2xl bg-white hover:bg-zinc-200 text-black font-bold text-xs tracking-tight transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <Plus size={16} />
              <span>{isSaving ? 'Сохранение...' : `Поставить пуш на ${newTime}`}</span>
            </button>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className="p-3 rounded-2xl bg-[#30D158]/15 text-[#30D158] text-xs font-medium text-center animate-in fade-in">
              {statusMessage}
            </div>
          )}

          {/* Active Reminders List */}
          <div className="flex flex-col gap-2.5 pt-3 border-t border-white/5">
            <div className="flex items-center justify-between text-xs text-[#8E8E93] font-semibold">
              <span>Активные пуши ({scheduledList.length}):</span>
              <button
                onClick={loadNotifications}
                disabled={isLoadingList}
                className="text-[#8E8E93] hover:text-white transition-colors cursor-pointer p-1"
                title="Обновить список"
              >
                <RefreshCw size={13} className={isLoadingList ? 'animate-spin' : ''} />
              </button>
            </div>

            {scheduledList.length === 0 && !isLoadingList && (
              <div className="text-center py-4 text-xs text-[#8E8E93]">
                Нет активных напоминаний
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
                    className="flex items-center justify-between p-3 rounded-2xl bg-[#1C1C1E] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#2C2C2E] flex items-center justify-center text-white font-bold text-xs">
                        {formattedTime}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">
                            В {formattedTime}
                          </span>
                          {isItemRecurring ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2C2C2E] text-[#8E8E93] font-semibold flex items-center gap-0.5">
                              <Repeat size={9} /> Регулярно
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2C2C2E] text-[#8E8E93] font-semibold">
                              Разовое
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-[#8E8E93] truncate max-w-[170px] mt-0.5">
                          {item.title}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-2 rounded-full text-[#8E8E93] hover:text-[#FF453A] hover:bg-[#FF453A]/15 transition-colors cursor-pointer"
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
