import { useRef, type ReactNode } from 'react'
import type { Material, MaterialContent } from '@/types'
import { useI18n } from '@/lib/i18n'
import { printElement } from '@/lib/print'
import { Button } from './ui'

type Ksp = Extract<MaterialContent, { kind: 'ksp' }>

const BLANK = '__________'

/** Многострочный текст с **жирным**: строки сохраняются, звёздочки превращаются в <b>. */
function Rich({ text }: { text: string }) {
  if (!text) return null
  return (
    <div className="space-y-1">
      {text.split('\n').map((line, i) => (
        <p key={i}>
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith('**') && part.endsWith('**') ? <b key={j}>{part.slice(2, -2)}</b> : part,
          )}
        </p>
      ))}
    </div>
  )
}

function List({ items }: { items: string[] }) {
  return (
    <div className="space-y-1">
      {items.map((x, i) => (
        <p key={i}>{x}</p>
      ))}
    </div>
  )
}

const cell = 'border border-slate-300 px-3 py-2 align-top text-sm text-slate-800 dark:border-slate-600 dark:text-slate-200'
const head = `${cell} w-[34%] bg-slate-50 font-semibold dark:bg-slate-800/60`

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <tr>
      <th className={`${head} text-left`}>{label}</th>
      <td className={cell}>{children}</td>
    </tr>
  )
}

/** Краткосрочный план (КСП/ҚМЖ) по официальному шаблону школ Казахстана. */
export function KspView({ material, content }: { material: Material; content: Ksp }) {
  const { t, tTitle, tGrade, tSubject } = useI18n()
  const docRef = useRef<HTMLDivElement>(null)
  const g = content.languageGoals
  const blocks = [
    { key: 'start', label: t('mat.ksp.start'), b: content.plan.start },
    { key: 'middle', label: t('mat.ksp.middle'), b: content.plan.middle },
    { key: 'end', label: t('mat.ksp.end'), b: content.plan.end },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex-1 rounded-xl bg-amber-50 px-4 py-2 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          {t('mat.ksp.check')}
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => docRef.current && printElement(docRef.current, tTitle(material))}
        >
          {t('mat.ksp.print')}
        </Button>
      </div>

      <div ref={docRef} className="space-y-4">
      <p className="text-center text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-white">
        {t('mat.ksp.title')}
      </p>
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[640px] border-collapse">
          <tbody>
            <Row label={`${t('mat.ksp.subject')}:`}>{material.subject ? tSubject(material.subject) : BLANK}</Row>
            <Row label={`${t('mat.ksp.section')}: ${content.section || BLANK}`}>
              <b>{t('mat.ksp.topic')}:</b> {tTitle(material)}
            </Row>
            <Row label={`${t('mat.ksp.school')}:`}>{BLANK}</Row>
            <Row label={`${t('mat.ksp.date')}:`}>{BLANK}</Row>
            <Row label={`${t('mat.ksp.teacher')}:`}>{BLANK}</Row>
            <Row label={`${t('mat.ksp.class')}:`}>{material.grade ? tGrade(material.grade) : BLANK}</Row>
            <Row label={`${t('mat.ksp.attendance')}:`}>{BLANK}</Row>
            <Row label={`${t('mat.ksp.learningObjectives')}:`}>
              <List items={content.learningObjectives} />
            </Row>
            <Row label={`${t('mat.ksp.lessonObjectives')}:`}>
              <List items={content.lessonObjectives} />
            </Row>
            <Row label={`${t('mat.ksp.criteria')}:`}>
              <List items={content.criteria} />
            </Row>
            <Row label={`${t('mat.ksp.languageGoals')}:`}>
              <div className="space-y-2">
                {g.students && (
                  <div>
                    <b>{t('mat.ksp.langStudents')}:</b>
                    <Rich text={g.students} />
                  </div>
                )}
                {g.keywords && (
                  <div>
                    <b>{t('mat.ksp.langKeywords')}:</b> {g.keywords}
                  </div>
                )}
                {g.terms && (
                  <div>
                    <b>{t('mat.ksp.langTerms')}:</b> {g.terms}
                  </div>
                )}
                {g.phrases && (
                  <div>
                    <b>{t('mat.ksp.langPhrases')}:</b>
                    <Rich text={g.phrases} />
                  </div>
                )}
              </div>
            </Row>
            <Row label={t('mat.ksp.crossCurricular')}>
              <Rich text={content.crossCurricular} />
            </Row>
            <Row label={t('mat.ksp.values')}>
              <Rich text={content.values} />
            </Row>
            <Row label={t('mat.ksp.thinking')}>
              <Rich text={content.thinkingLevels} />
            </Row>
            <Row label={t('mat.ksp.prerequisites')}>
              <Rich text={content.prerequisites} />
            </Row>
            <Row label={`${t('mat.ksp.extraInfo')}:`}>
              <Rich text={content.extraInfo} />
            </Row>
          </tbody>
        </table>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr>
              <th colSpan={3} className={`${cell} bg-slate-50 text-center font-semibold dark:bg-slate-800/60`}>
                {t('mat.ksp.plan')}
              </th>
            </tr>
            <tr>
              <th className={`${cell} w-[16%] text-left font-semibold`}>{t('mat.ksp.time')}:</th>
              <th className={`${cell} text-left font-semibold`}>{t('mat.ksp.activities')}</th>
              <th className={`${cell} w-[22%] text-left font-semibold`}>{t('mat.ksp.resources')}</th>
            </tr>
          </thead>
          <tbody>
            {blocks.map(({ key, label, b }) => (
              <tr key={key}>
                <th className={`${cell} text-left font-semibold`}>
                  {label}:
                  <div className="text-xs font-normal text-slate-500">{t('mat.lesson.min', { n: b.minutes })}</div>
                </th>
                <td className={cell}>
                  <Rich text={b.activities} />
                </td>
                <td className={cell}>
                  <Rich text={b.resources} />
                </td>
              </tr>
            ))}
            <tr>
              <th className={`${cell} text-left font-semibold`}>{t('mat.ksp.lessonReflection')}</th>
              <td className={cell} colSpan={2}>
                <Rich text={content.lessonReflection} />
              </td>
            </tr>
            <tr>
              <th className={`${cell} text-left font-semibold`}>{t('mat.ksp.homework')}</th>
              <td className={cell} colSpan={2}>
                <Rich text={content.homework} />
              </td>
            </tr>
            <tr>
              <th className={`${cell} text-left font-semibold`}>{t('mat.ksp.differentiation')}</th>
              <td className={cell} colSpan={2}>
                <div className="space-y-2">
                  <div>
                    <b>{t('mat.ksp.support')}</b>
                    <Rich text={content.differentiation.support} />
                  </div>
                  <div>
                    <b>{t('mat.ksp.advanced')}</b>
                    <Rich text={content.differentiation.advanced} />
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <th className={`${cell} text-left font-semibold`}>{t('mat.ksp.reflection')}</th>
              <td className={cell} colSpan={2}>
                &nbsp;
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      </div>
    </div>
  )
}
