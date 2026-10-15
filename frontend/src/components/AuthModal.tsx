import React, { useState } from 'react'
import { LogIn, UserPlus, KeyRound, Mail, AlertCircle, X, Shield } from 'lucide-react'
import { signInWithEmail, signUpWithEmail } from '../lib/auth'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (user: any) => void
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)

    try {
      if (isSignUp) {
        const res = await signUpWithEmail(email, password)
        if (res.user) {
          onSuccess(res.user)
          onClose()
        }
      } else {
        const res = await signInWithEmail(email, password)
        if (res.user) {
          onSuccess(res.user)
          onClose()
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Ошибка аутентификации. Проверьте данные.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-[#0c0c0e] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#d4af37]/20 to-amber-900/10 border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.2)] mb-2">
            <Shield size={24} />
          </div>
          <h3 className="text-lg font-extrabold text-white">
            {isSignUp ? 'Регистрация' : 'Вход в Game Changer'}
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Сохраняй прогресс и получай персональные напоминания
          </p>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/50 border border-red-500/30 text-red-400 text-xs">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Mail size={13} className="text-[#d4af37]" /> Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-[#d4af37]/60"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <KeyRound size={13} className="text-[#d4af37]" /> Пароль
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 6 символов"
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-[#d4af37]/60"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 w-full py-3 rounded-xl bg-gradient-to-r from-[#d4af37] to-amber-600 hover:from-amber-400 hover:to-amber-600 text-black font-extrabold text-xs tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              'Загрузка...'
            ) : isSignUp ? (
              <>
                <UserPlus size={16} /> Создать аккаунт
              </>
            ) : (
              <>
                <LogIn size={16} /> Войти
              </>
            )}
          </button>
        </form>

        <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setErrorMessage(null)
            }}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            {isSignUp ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Создать'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Локально
          </button>
        </div>
      </div>
    </div>
  )
}
