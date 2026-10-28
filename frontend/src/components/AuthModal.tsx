import React, { useState } from 'react'
import { LogIn, UserPlus, Mail, AlertCircle, X, Shield, Lock } from 'lucide-react'
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
      setErrorMessage(err.message || 'Ошибка аутентификации. Проверьте введённые данные.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 safe-modal-container bg-black/85 backdrop-blur-2xl animate-in fade-in duration-200">
      {/* iOS style modal surface: borderless, solid #1C1C1E */}
      <div className="relative w-full max-w-sm bg-[#1C1C1E] rounded-3xl p-6 shadow-2xl flex flex-col gap-5">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#8E8E93] hover:text-white transition-colors p-2 rounded-full hover:bg-[#2C2C2E] cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center text-center mt-1">
          <div className="w-14 h-14 rounded-full bg-[#0A84FF]/15 text-[#0A84FF] flex items-center justify-center mb-3">
            <Shield size={26} />
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            Game Changer
          </h3>
          <p className="text-xs text-[#8E8E93] mt-1 max-w-[240px] leading-relaxed">
            Синхронизация прогресса, троп и персональных уведомлений
          </p>
        </div>

        {/* Segmented iOS control: Войти / Регистрация */}
        <div className="bg-[#2C2C2E] p-1 rounded-2xl grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false)
              setErrorMessage(null)
            }}
            className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              !isSignUp
                ? 'bg-white text-black shadow-sm'
                : 'text-[#8E8E93] hover:text-white'
            }`}
          >
            Войти
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true)
              setErrorMessage(null)
            }}
            className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isSignUp
                ? 'bg-white text-black shadow-sm'
                : 'text-[#8E8E93] hover:text-white'
            }`}
          >
            Регистрация
          </button>
        </div>

        {/* Error notification banner */}
        {errorMessage && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-[#FF453A]/15 text-[#FF453A] text-xs font-medium animate-in fade-in">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#8E8E93] ml-1 flex items-center gap-1.5">
              <Mail size={13} className="text-[#8E8E93]" /> Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-[#2C2C2E] rounded-2xl px-4 py-3 text-white text-sm focus:outline-none placeholder:text-[#8E8E93]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#8E8E93] ml-1 flex items-center gap-1.5">
              <Lock size={13} className="text-[#8E8E93]" /> Пароль
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 6 символов"
              className="w-full bg-[#2C2C2E] rounded-2xl px-4 py-3 text-white text-sm focus:outline-none placeholder:text-[#8E8E93]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 w-full py-3.5 rounded-full bg-white hover:bg-zinc-200 text-black font-bold text-xs tracking-tight flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
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

        <div className="text-center pt-1">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
          >
            Продолжить без входа
          </button>
        </div>
      </div>
    </div>
  )
}
export default AuthModal
