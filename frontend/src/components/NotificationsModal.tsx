import React, { useState, useEffect } from 'react'
import { Bell, X, Check, Send, AlertCircle, Clock, Sparkles } from 'lucide-react'
import {
  subscribeToPush,
  sendTestPush,
  getNotificationPermissionStatus,
  schedulePushNotification
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
  const [scheduledSuccess, setScheduledSuccess] = useState(false)
  const [dailyHour, setDailyHour] = useState('11:00')

  useEffect(() => {
    if (isOpen) {
      setPermission(getNotificationPermissionStatus())
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleEnablePush = async () => {
    setIsSubscribing(true)
    try {
      const ok = await subscribeToPush(backendUrl, userId)
      setPermission(getNotificationPermissionStatus())
      if (ok) {
        // Send a welcoming push
        await sendTestPush(backendUrl, userId)
        setTestSent(true)
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

  const handleScheduleDaily = async () => {
    try {
      const [hours, minutes] = dailyHour.split(':').map(Number)
      const targetDate = new Date()
      targetDate.setHours(hours, minutes, 0, 0)
      if (targetDate.getTime() <= Date.now()) {
        targetDate.setDate(targetDate.getDate() + 1)
      }

      await schedulePushNotification(backendUrl, {
        userId,
        targetTime: targetDate.toISOString(),
        title: 'Game Changer: Body 🎯',
        body: 'Время для твоей микротренировки! Сохраняй стрик и продолжай путь.'
      })
      setScheduledSuccess(true)
      setTimeout(() => setScheduledSuccess(false), 3000)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0a0a0d] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-5">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/5"
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
              Web Push без платных сервисов (VAPID)
            </p>
          </div>
        </div>

        {/* Permission Status */}
        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-zinc-300">
              Статус Push в браузере:
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
              Отправить тестовое уведомление
            </button>
          )}

          {testSent && (
            <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <Check size={14} className="stroke-[3]" />
              Тестовый пуш отправлен! Проверь шторку уведомлений.
            </div>
          )}
        </div>

        {/* Daily Schedule Reminder */}
        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-300">
            <Clock size={14} className="text-[#d4af37]" />
            <span>Время ежедневного напоминания</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="time"
              value={dailyHour}
              onChange={(e) => setDailyHour(e.target.value)}
              className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#d4af37]/60"
            />
            <button
              onClick={handleScheduleDaily}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-zinc-800 to-zinc-900 border border-white/10 hover:border-[#d4af37]/50 text-white font-bold text-xs tracking-wider transition-all cursor-pointer active:scale-95"
            >
              Сохранить
            </button>
          </div>

          {scheduledSuccess && (
            <div className="text-[11px] font-mono text-emerald-400">
              ✓ Напоминание запланировано на {dailyHour}!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
export default NotificationsModal
