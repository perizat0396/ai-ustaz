import { useState, type ReactNode } from 'react'
import { cx } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { Button } from './ui'
import { IconArrowLeft } from './Icon'

/** Небольшая пауза после выбора ответа — чтобы был виден отклик перед автопереходом. */
const AUTO_ADVANCE_MS = 350

/** Шкала согласия 1–5 (как в опросниках Лайкерта): подписаны только края. */
export function Scale({
  value,
  onChange,
}: {
  value: number | null
  onChange: (v: number) => void
}) {
  const { t } = useI18n()
  return (
    <div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cx(
              'grid size-11 flex-1 place-items-center rounded-xl border text-sm font-bold transition',
              value === n
                ? 'border-brand-500 bg-brand-600 text-white shadow-sm'
                : 'border-slate-200 text-slate-500 hover:border-brand-300 dark:border-slate-700 dark:text-slate-400',
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-slate-400">
        <span>{t('survey.scaleLow')}</span>
        <span>{t('survey.scaleHigh')}</span>
      </div>
    </div>
  )
}

/** Одиночный выбор из вариантов в виде кнопок-чипов. */
export function Choice<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T | null
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-xl border px-3 py-2 text-sm font-semibold transition',
            value === o.value
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-950'
              : 'border-slate-200 hover:border-slate-300 dark:border-slate-700',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Оценка звёздами 1–5 — для итоговой общей оценки платформы. */
export function Stars({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex justify-center gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={String(n)}
          className="text-4xl leading-none transition hover:scale-110"
        >
          <span className={value !== null && n <= value ? 'text-amber-400' : 'text-slate-300 dark:text-slate-700'}>
            ★
          </span>
        </button>
      ))}
    </div>
  )
}

/**
 * Обёртка одного шага анкеты-визарда: прогресс-бар, заголовок вопроса,
 * кнопка «Назад». Автопереход вперёд делает сам вопрос (см. useAutoAdvance) —
 * здесь остаётся кнопка «Далее» только когда авто-переход не подходит
 * (текст/число), через children-кнопку, которую передаёт вызывающая страница.
 */
export function SurveyStep({
  index,
  total,
  question,
  onBack,
  children,
  footer,
}: {
  index: number
  total: number
  question: string
  onBack: (() => void) | null
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>{index + 1} / {total}</span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={cx(
                'h-1.5 flex-1 rounded-full transition-colors',
                i <= index ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700/60',
              )}
            />
          ))}
        </div>
      </div>

      <p className="text-lg font-semibold leading-snug text-slate-900 dark:text-white">{question}</p>

      {children}

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="secondary" onClick={onBack ?? undefined} disabled={!onBack}>
          <IconArrowLeft width={15} height={15} />
        </Button>
        {footer}
      </div>
    </div>
  )
}

/** Обёртка выбора (Choice/Scale) с автопереходом на следующий вопрос после ответа. */
export function useAutoAdvance(goNext: () => void) {
  const [pending, setPending] = useState(false)
  const pick = (setValue: () => void) => {
    setValue()
    setPending(true)
    setTimeout(() => {
      setPending(false)
      goNext()
    }, AUTO_ADVANCE_MS)
  }
  return { pick, pending }
}
