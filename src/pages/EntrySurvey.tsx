import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui'
import { Choice, Scale, SurveyStep, useAutoAdvance } from '@/components/SurveyControls'
import { IconArrowRight, IconClipboardCheck } from '@/components/Icon'

type Frequency = 'never' | 'rare' | 'sometimes' | 'often'

const SCALE_FIELDS = [
  'readiness',
  'shareWillingness',
  'useOthersWillingness',
  'digitalSkills',
  'networkConceptFamiliarity',
  'aiConfidence',
] as const
type ScaleKey = (typeof SCALE_FIELDS)[number]

/** Шаги: 2 выбора (choice) + 6 шкал + число + текст = 10 вопросов. */
const STEPS = 2 + SCALE_FIELDS.length + 2
const SCALE_START = 2
const PREP_TIME_STEP = SCALE_START + SCALE_FIELDS.length
const EXPECT_STEP = PREP_TIME_STEP + 1

/**
 * Обязательная входная анкета (Анкета 1) докторского исследования — блокирует
 * доступ к остальной платформе, пока не отправлена (см. Layout.tsx). Роль
 * пользователя уже собрана при регистрации (profiles.role), здесь не дублируется.
 * Формат: вступление → кнопка «Начать» → по одному вопросу с автопереходом
 * (можно вернуться назад).
 */
export function EntrySurvey() {
  const { markEntrySurveyDone } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()

  const [step, setStep] = useState(-1) // -1 — вступление
  const [frequency, setFrequency] = useState<Frequency | null>(null)
  const [community, setCommunity] = useState<Frequency | null>(null)
  const [scales, setScales] = useState<Record<ScaleKey, number | null>>({
    readiness: null,
    shareWillingness: null,
    useOthersWillingness: null,
    digitalSkills: null,
    networkConceptFamiliarity: null,
    aiConfidence: null,
  })
  const [prepTime, setPrepTime] = useState('')
  const [expectations, setExpectations] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const next = () => setStep((s) => Math.min(STEPS - 1, s + 1))
  const back = () => setStep((s) => Math.max(-1, s - 1))
  const { pick, pending } = useAutoAdvance(next)

  const prepTimeNum = Number(prepTime)
  const prepTimeValid = prepTime.trim().length > 0 && prepTimeNum > 0

  const submit = async () => {
    const allScalesFilled = SCALE_FIELDS.every((k) => scales[k] !== null)
    if (!frequency || !community || !allScalesFilled || !prepTimeValid || !expectations.trim()) {
      setError(t('survey.required'))
      return
    }
    setError(null)
    setBusy(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Не удалось определить пользователя.')
      // upsert — а не insert: если из-за сетевого сбоя предыдущая попытка всё же
      // сохранилась, повторная отправка не должна падать с ошибкой дубликата.
      const { error: dbErr } = await supabase.from('entry_surveys').upsert({
        owner_id: user.id,
        answers: {
          networkFrequency: frequency,
          communityParticipation: community,
          networkReadiness: scales.readiness,
          shareWillingness: scales.shareWillingness,
          useOthersWillingness: scales.useOthersWillingness,
          digitalSkills: scales.digitalSkills,
          networkConceptFamiliarity: scales.networkConceptFamiliarity,
          aiConfidence: scales.aiConfidence,
          prepTimeMinutes: prepTimeNum,
          expectations: expectations.trim(),
        },
      })
      if (dbErr) throw new Error(dbErr.message)
      markEntrySurveyDone()
      navigate('/', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  const frequencyOptions: { value: Frequency; label: string }[] = [
    { value: 'never', label: t('survey.entry.frequency.never') },
    { value: 'rare', label: t('survey.entry.frequency.rare') },
    { value: 'sometimes', label: t('survey.entry.frequency.sometimes') },
    { value: 'often', label: t('survey.entry.frequency.often') },
  ]

  if (step === -1) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="card space-y-5 p-6 text-center sm:p-8">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
            <IconClipboardCheck width={26} height={26} />
          </div>
          <div className="space-y-2 text-left">
            <h1 className="text-center text-xl font-bold text-slate-900 dark:text-white">
              {t('survey.entry.title')}
            </h1>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {t('survey.entry.purpose')}
            </p>
          </div>
          <Button size="lg" className="w-full" onClick={() => setStep(0)}>
            {t('survey.start')} <IconArrowRight width={16} height={16} />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="card p-6 sm:p-8">
        {step === 0 && (
          <SurveyStep index={0} total={STEPS} question={t('survey.entry.q.frequency')} onBack={() => setStep(-1)}>
            <fieldset disabled={pending}>
              <Choice value={frequency} onChange={(v) => pick(() => setFrequency(v))} options={frequencyOptions} />
            </fieldset>
          </SurveyStep>
        )}

        {step === 1 && (
          <SurveyStep index={1} total={STEPS} question={t('survey.entry.q.community')} onBack={back}>
            <fieldset disabled={pending}>
              <Choice value={community} onChange={(v) => pick(() => setCommunity(v))} options={frequencyOptions} />
            </fieldset>
          </SurveyStep>
        )}

        {SCALE_FIELDS.map((key, i) => {
          const index = SCALE_START + i
          if (step !== index) return null
          return (
            <SurveyStep key={key} index={index} total={STEPS} question={t(`survey.entry.q.${key}`)} onBack={back}>
              <fieldset disabled={pending}>
                <Scale value={scales[key]} onChange={(v) => pick(() => setScales((s) => ({ ...s, [key]: v })))} />
              </fieldset>
            </SurveyStep>
          )
        })}

        {step === PREP_TIME_STEP && (
          <SurveyStep
            index={PREP_TIME_STEP}
            total={STEPS}
            question={t('survey.entry.q.prepTime')}
            onBack={back}
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
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && prepTimeValid && next()}
              />
              <span className="text-sm text-slate-500 dark:text-slate-400">{t('survey.entry.prepTimeUnit')}</span>
            </div>
          </SurveyStep>
        )}

        {step === EXPECT_STEP && (
          <SurveyStep
            index={EXPECT_STEP}
            total={STEPS}
            question={t('survey.entry.q.expectations')}
            onBack={back}
            footer={
              <Button onClick={submit} disabled={!expectations.trim() || busy}>
                {busy ? t('survey.submitting') : t('survey.submit')}
              </Button>
            }
          >
            <textarea
              autoFocus
              className="input-base resize-none"
              rows={3}
              value={expectations}
              onChange={(e) => setExpectations(e.target.value)}
              placeholder={t('survey.entry.expectationsPlaceholder')}
            />
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
