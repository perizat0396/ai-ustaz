import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { UserRole } from '@/types'
import { useAuth } from '@/lib/auth'
import { USER_ROLES, useI18n } from '@/lib/i18n'
import { Button, Field } from '@/components/ui'
import { IconEye, IconEyeOff } from '@/components/Icon'

export function Auth() {
  const navigate = useNavigate()
  const location = useLocation()
  // Куда вернуть после входа — страница, с которой гостя перенаправили на /login.
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const { signIn, signUp } = useAuth()
  const { t, tRole } = useI18n()

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [role, setRole] = useState<UserRole>('school_teacher')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signedUp, setSignedUp] = useState(false)

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      if (mode === 'signin') {
        await signIn(email, password)
        navigate(from, { replace: true })
      } else {
        await signUp(email, password, name.trim() || email.split('@')[0], role)
        setSignedUp(true)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (signedUp) {
    return (
      <div className="mx-auto max-w-sm">
        <div className="card p-6 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300">{t('auth.signUpDone')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="card space-y-4 p-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          {mode === 'signin' ? t('auth.signInTitle') : t('auth.signUpTitle')}
        </h1>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          {mode === 'signup' && (
            <>
              <Field label={t('auth.name')}>
                <input
                  className="input-base"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('auth.namePlaceholder')}
                  autoComplete="name"
                />
              </Field>

              <Field label={t('auth.role')}>
                <select
                  className="input-base appearance-none"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                >
                  {USER_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {tRole(r)}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}

          <Field label={t('auth.email')}>
            <input
              type="email"
              required
              className="input-base"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </Field>

          <Field label={t('auth.password')}>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                className="input-base pr-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                onClick={(e) => {
                  // Кнопка внутри <label> — без preventDefault клик перевёл бы фокус/клик на input.
                  e.preventDefault()
                  setShowPassword((v) => !v)
                }}
                className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                title={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              >
                {showPassword ? <IconEyeOff /> : <IconEye />}
              </button>
            </div>
          </Field>

          {error && (
            <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={busy}>
            {mode === 'signin' ? t('auth.signIn') : t('auth.signUp')}
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          {mode === 'signin' ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
          <button
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="font-semibold text-brand-600 hover:underline dark:text-brand-400"
          >
            {mode === 'signin' ? t('auth.toSignUp') : t('auth.toSignIn')}
          </button>
        </p>
      </div>
    </div>
  )
}
