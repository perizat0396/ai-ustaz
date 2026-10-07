import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import { Button } from './ui'
import { IconCheck, IconClipboardCheck } from './Icon'

/** Прошёл ли вошедший пользователь анкету 2 (эффективность платформы). */
export function useExitSurveyDone(): boolean {
  const { session } = useAuth()
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!session?.user) {
      setDone(false)
      return
    }
    let cancelled = false
    supabase
      .from('exit_surveys')
      .select('owner_id')
      .eq('owner_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setDone(!!data)
      })
    return () => {
      cancelled = true
    }
  }, [session?.user])

  return done
}

/** Яркая карточка-приглашение на анкету 2 — для главной страницы (видное место). */
export function ExitSurveyBanner() {
  const { session } = useAuth()
  const done = useExitSurveyDone()
  const { t } = useI18n()

  if (!session) return null

  return (
    <Link
      to="/survey/exit"
      className="group relative flex flex-col items-start gap-4 overflow-hidden rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-violet-50 p-6 shadow-sm transition hover:shadow-md dark:border-brand-900/50 dark:from-brand-950/40 dark:via-slate-900 dark:to-violet-950/30 sm:flex-row sm:items-center"
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-600 text-white shadow-sm">
        <IconClipboardCheck width={22} height={22} />
      </span>
      <div className="flex-1">
        <p className="font-semibold text-slate-900 dark:text-white">{t('profile.survey.title')}</p>
        <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{t('profile.survey.hint')}</p>
      </div>
      <Button variant={done ? 'secondary' : 'primary'} className="shrink-0">
        {done ? (
          <>
            <IconCheck width={15} height={15} /> {t('survey.exit.edit')}
          </>
        ) : (
          t('profile.survey.cta')
        )}
      </Button>
    </Link>
  )
}
