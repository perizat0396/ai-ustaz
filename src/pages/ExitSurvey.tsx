import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import { Button, EmptyState, Spinner } from '@/components/ui'
import { Scale, Stars, SurveyStep, useAutoAdvance } from '@/components/SurveyControls'
import { IconArrowRight, IconCheck } from '@/components/Icon'

interface ExitAnswers {
  prepTimeMinutesNow: number
  timeSaved: number
  usability: number
  networkUnderstanding: number
  communityUseful: number
  networkConfidence: number
  networkSkills: number
  materialQuality: number
  meetsNeeds: number
  wouldRecommend: number
  liked: string
  improve: string
  comments: string
  overallRating: number
}

const SCALE_FIELDS = [
  'timeSaved',
  'usability',
  'networkUnderstanding',
  'communityUseful',
  'networkConfidence',
  'networkSkills',
  'materialQuality',
  'meetsNeeds',
  'wouldRecommend',
] as const

/** Шаги визарда: время → шкалы → открытые вопросы → звёзды (последний шаг, отправляет анкету). */
const STEPS = 1 + SCALE_FIELDS.length + 4 // prepTimeNow + 9 шкал + liked/improve/comments + rating
const TEXT_STEP_START = 1 + SCALE_FIELDS.length // индекс шага «liked»
const RATING_STEP = TEXT_STEP_START + 3

/**
 * Анкета 2 (Анкета исследования) — учитель открывает сам из профиля после
 * того, как попользовался платформой. Можно пройти повторно, чтобы обновить
 * отзыв (upsert), поэтому при открытии подгружаем прошлый ответ, если он есть.
 * Формат: вступление → кнопка «Начать» → по одному вопросу с автопереходом
 * для шкал (можно вернуться назад), текстовые вопросы — кнопкой «Далее».
 */
export function ExitSurvey() {
  const { session } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(-1) // -1 — вступление
  const [prepTimeNow, setPrepTimeNow] = useState('')
  const [scales, setScales] = useState<Record<(typeof SCALE_FIELDS)[number], number | null>>({
    timeSaved: null,
    usability: null,
    networkUnderstanding: null,
    communityUseful: null,
    networkConfidence: null,
    networkSkills: null,
    materialQuality: null,
    meetsNeeds: null,
    wouldRecommend: null,
  })
  const [liked, setLiked] = useState('')
  const [improve, setImprove] = useState('')
  const [comments, setComments] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!session?.user) return
    let cancelled = false
    supabase
      .from('exit_surveys')
      .select('answers')
      .eq('owner_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        const a = data?.answers as Partial<ExitAnswers> | undefined
        if (a) {
          setScales((s) => {
            const next = { ...s }
            for (const k of SCALE_FIELDS) if (typeof a[k] === 'number') next[k] = a[k] as number
            return next
          })
          setPrepTimeNow(a.prepTimeMinutesNow ? String(a.prepTimeMinutesNow) : '')
          setLiked(a.liked ?? '')
          setImprove(a.improve ?? '')
          setComments(a.comments ?? '')
          if (typeof a.overallRating === 'number') setRating(a.overallRating)
        }
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [session?.user])

  const next = () => setStep((s) => Math.min(STEPS - 1, s + 1))
  const back = () => setStep((s) => Math.max(-1, s - 1))
  const { pick, pending } = useAutoAdvance(next)

  if (!session) {
    return (
      <EmptyState
        title={t('auth.requiredTitle')}
        description={t('auth.requiredDesc')}
        action={<Button onClick={() => navigate('/login')}>{t('auth.toSignIn')}</Button>}
      />
    )
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        <Spinner className="text-brand-600" />
      </div>
    )
  }

  const prepTimeNum = Number(prepTimeNow)
  const prepTimeValid = prepTimeNow.trim().length > 0 && prepTimeNum > 0

  const submit = async (finalRating: number) => {
    if (!prepTimeValid || SCALE_FIELDS.some((k) => scales[k] === null) || !liked.trim() || !improve.trim()) {
      setError(t('survey.required'))
      return
    }
    setError(null)
    setBusy(true)
    try {
      const answers: ExitAnswers = {
        prepTimeMinutesNow: prepTimeNum,
        timeSaved: scales.timeSaved!,
        usability: scales.usability!,
        networkUnderstanding: scales.networkUnderstanding!,
        communityUseful: scales.communityUseful!,
        networkConfidence: scales.networkConfidence!,
        networkSkills: scales.networkSkills!,
        materialQuality: scales.materialQuality!,
        meetsNeeds: scales.meetsNeeds!,
        wouldRecommend: scales.wouldRecommend!,
        liked: liked.trim(),
        improve: improve.trim(),
        comments: comments.trim(),
        overallRating: finalRating,
      }
      const { error: dbErr } = await supabase
        .from('exit_surveys')
        .upsert({ owner_id: session.user!.id, answers, updated_at: new Date().toISOString() })
      if (dbErr) throw new Error(dbErr.message)
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <EmptyState
        icon={<IconCheck />}
        title={t('survey.exit.done')}
        action={<Button onClick={() => navigate('/profile')}>{t('common.home')}</Button>}
      />
    )
  }

  if (step === -1) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="card space-y-5 p-6 text-center sm:p-8">
          <p className="mx-auto inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-700 dark:bg-brand-950 dark:text-brand-300">
            {t('survey.exit.intro.title')}
          </p>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('survey.exit.title')}</h1>
          <div className="space-y-3 text-left text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <p>{t('survey.exit.intro.body')}</p>
            <p>{t('survey.exit.intro.capabilities')}</p>
            <p className="font-medium text-slate-800 dark:text-slate-100">{t('survey.exit.intro.cta')}</p>
          </div>
          <Button size="lg" className="w-full" onClick={() => setStep(0)}>
            {t('survey.start')} <IconArrowRight width={16} height={16} />
          </Button>
        </div>
      </div>
    )
  }

  const scaleStep = (i: number, key: (typeof SCALE_FIELDS)[number]) => (
    <SurveyStep
      key={key}
      index={i}
      total={STEPS}
      question={t(`survey.exit.q.${key}`)}
      onBack={i === 0 ? () => setStep(-1) : back}
    >
      <fieldset disabled={pending}>
        <Scale value={scales[key]} onChange={(v) => pick(() => setScales((s) => ({ ...s, [key]: v })))} />
      </fieldset>
    </SurveyStep>
  )

  return (
    <div className="mx-auto max-w-xl">
      <div className="card p-6 sm:p-8">
        {step === 0 && (
          <SurveyStep
            index={0}
            total={STEPS}
            question={t('survey.exit.q.prepTimeNow')}
            onBack={() => setStep(-1)}
            footer={
              <Button onClick={next} disabled={!prepTimeValid}>
                {t('common.next')} <IconArrowRight width={15} height={15} />
              </Button>
            }
          >
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                autoFocus
                className="input-base w-28"
                value={prepTimeNow}
                onChange={(e) => setPrepTimeNow(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && prepTimeValid && next()}
              />
              <span className="text-sm text-slate-500 dark:text-slate-400">{t('survey.entry.prepTimeUnit')}</span>
            </div>
          </SurveyStep>
        )}

        {SCALE_FIELDS.map((key, i) => step === i + 1 && scaleStep(i + 1, key))}

        {step === TEXT_STEP_START && (
          <SurveyStep
            index={TEXT_STEP_START}
            total={STEPS}
            question={t('survey.exit.q.liked')}
            onBack={back}
            footer={
              <Button onClick={next} disabled={!liked.trim()}>
                {t('common.next')} <IconArrowRight width={15} height={15} />
              </Button>
            }
          >
            <textarea
              autoFocus
              className="input-base resize-none"
              rows={3}
              value={liked}
              onChange={(e) => setLiked(e.target.value)}
              placeholder={t('survey.exit.feedbackPlaceholder')}
            />
          </SurveyStep>
        )}

        {step === TEXT_STEP_START + 1 && (
          <SurveyStep
            index={TEXT_STEP_START + 1}
            total={STEPS}
            question={t('survey.exit.q.improve')}
            onBack={back}
            footer={
              <Button onClick={next} disabled={!improve.trim()}>
                {t('common.next')} <IconArrowRight width={15} height={15} />
              </Button>
            }
          >
            <textarea
              autoFocus
              className="input-base resize-none"
              rows={3}
              value={improve}
              onChange={(e) => setImprove(e.target.value)}
              placeholder={t('survey.exit.feedbackPlaceholder')}
            />
          </SurveyStep>
        )}

        {step === TEXT_STEP_START + 2 && (
          <SurveyStep
            index={TEXT_STEP_START + 2}
            total={STEPS}
            question={t('survey.exit.q.comments')}
            onBack={back}
            footer={
              <Button onClick={next}>
                {t('common.next')} <IconArrowRight width={15} height={15} />
              </Button>
            }
          >
            <textarea
              autoFocus
              className="input-base resize-none"
              rows={2}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={t('survey.exit.feedbackPlaceholder')}
            />
          </SurveyStep>
        )}

        {step === RATING_STEP && (
          <SurveyStep index={RATING_STEP} total={STEPS} question={t('survey.exit.q.overallRating')} onBack={back}>
            {busy ? (
              <div className="flex justify-center py-2">
                <Spinner className="text-brand-600" />
              </div>
            ) : (
              <Stars value={rating} onChange={(v) => { setRating(v); void submit(v) }} />
            )}
            {error && (
              <p className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                {error}
              </p>
            )}
          </SurveyStep>
        )}
      </div>
    </div>
  )
}
