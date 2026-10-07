import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { UserRef, UserRole } from '@/types'
import { supabase } from './supabase'

/* --------------------------------------------------------------------------
 *  Авторизация через Supabase Auth (email + пароль). Профиль пользователя
 *  (имя, роль, цвет аватара) хранится в таблице public.profiles и создаётся
 *  автоматически триггером при регистрации (см. supabase/migrations).
 * ----------------------------------------------------------------------- */

interface AuthValue {
  /** null — гость (не вошёл), undefined — сессия ещё загружается. */
  session: Session | null | undefined
  profile: UserRef | null
  /** Доступ к странице аналитики исследования (/admin). */
  isAdmin: boolean
  /** Прошёл ли пользователь входную анкету исследования. undefined — ещё проверяется. */
  entrySurveyDone: boolean | undefined
  /** Вызвать сразу после успешной отправки входной анкеты — снимает блокировку без перезагрузки. */
  markEntrySurveyDone: () => void
  signUp: (email: string, password: string, name: string, role: UserRole) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

async function fetchProfile(userId: string): Promise<{ ref: UserRef; isAdmin: boolean } | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, name, role, avatar_color, is_admin')
    .eq('id', userId)
    .single()
  if (!data) return null
  return {
    ref: { id: data.id, name: data.name, role: data.role, avatarColor: data.avatar_color },
    isAdmin: !!data.is_admin,
  }
}

async function fetchEntrySurveyDone(userId: string): Promise<boolean> {
  const { data } = await supabase.from('entry_surveys').select('owner_id').eq('owner_id', userId).maybeSingle()
  return !!data
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [profile, setProfile] = useState<UserRef | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [entrySurveyDone, setEntrySurveyDone] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setProfile(null)
      setIsAdmin(false)
      setEntrySurveyDone(undefined)
      return
    }
    let cancelled = false
    void fetchProfile(session.user.id).then((p) => {
      if (cancelled) return
      setProfile(p?.ref ?? null)
      setIsAdmin(p?.isAdmin ?? false)
    })
    void fetchEntrySurveyDone(session.user.id).then((done) => {
      if (!cancelled) setEntrySurveyDone(done)
    })
    return () => {
      cancelled = true
    }
  }, [session?.user])

  const value = useMemo<AuthValue>(
    () => ({
      session,
      profile,
      isAdmin,
      entrySurveyDone,
      markEntrySurveyDone: () => setEntrySurveyDone(true),
      signUp: async (email, password, name, role) => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name, role } },
        })
        if (error) throw new Error(error.message)
      },
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw new Error(error.message)
      },
      signOut: async () => {
        await supabase.auth.signOut()
      },
    }),
    [session, profile, isAdmin, entrySurveyDone],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
