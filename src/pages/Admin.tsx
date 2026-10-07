import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import { EmptyState, Spinner, Button } from '@/components/ui'
import { IconArrowLeft } from '@/components/Icon'

interface EntryAnswers {
  networkFrequency: 'never' | 'rare' | 'sometimes' | 'often'
  communityParticipation: 'never' | 'rare' | 'sometimes' | 'often'
  networkReadiness: number
  shareWillingness: number
  useOthersWillingness: number
  digitalSkills: number
  networkConceptFamiliarity: number
  aiConfidence: number
  prepTimeMinutes: number
  expectations: string
}

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

interface Row {
  id: string
  name: string
  role: string
  entry: EntryAnswers | null
  exit: ExitAnswers | null
}

const EXIT_SCALE_KEYS: (keyof ExitAnswers)[] = [
  'usability',
  'timeSaved',
  'networkUnderstanding',
  'communityUseful',
  'networkConfidence',
  'networkSkills',
  'materialQuality',
  'meetsNeeds',
  'wouldRecommend',
]

const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null)
const fmt = (n: number | null, digits = 1) => (n === null ? '—' : n.toFixed(digits))

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function downloadCsv(rows: Row[]) {
  const headers = [
    'name',
    'role',
    'entry_networkFrequency',
    'entry_communityParticipation',
    'entry_networkReadiness',
    'entry_shareWillingness',
    'entry_useOthersWillingness',
    'entry_digitalSkills',
    'entry_networkConceptFamiliarity',
    'entry_aiConfidence',
    'entry_prepTimeMinutes',
    'entry_expectations',
    'exit_prepTimeMinutesNow',
    'exit_timeSaved',
    'exit_usability',
    'exit_networkUnderstanding',
    'exit_communityUseful',
    'exit_networkConfidence',
    'exit_networkSkills',
    'exit_materialQuality',
    'exit_meetsNeeds',
    'exit_wouldRecommend',
    'exit_liked',
    'exit_improve',
    'exit_comments',
    'exit_overallRating',
  ]
  const lines = [headers.join(',')]
  for (const r of rows) {
    lines.push(
      [
        r.name,
        r.role,
        r.entry?.networkFrequency,
        r.entry?.communityParticipation,
        r.entry?.networkReadiness,
        r.entry?.shareWillingness,
        r.entry?.useOthersWillingness,
        r.entry?.digitalSkills,
        r.entry?.networkConceptFamiliarity,
        r.entry?.aiConfidence,
        r.entry?.prepTimeMinutes,
        r.entry?.expectations,
        r.exit?.prepTimeMinutesNow,
        r.exit?.timeSaved,
        r.exit?.usability,
        r.exit?.networkUnderstanding,
        r.exit?.communityUseful,
        r.exit?.networkConfidence,
        r.exit?.networkSkills,
        r.exit?.materialQuality,
        r.exit?.meetsNeeds,
        r.exit?.wouldRecommend,
        r.exit?.liked,
        r.exit?.improve,
        r.exit?.comments,
        r.exit?.overallRating,
      ]
        .map(csvEscape)
        .join(','),
    )
  }
  // ﻿ — BOM, чтобы Excel сразу показал кириллицу в UTF-8 корректно.
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ai-ustaz-surveys-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

export function Admin() {
  const { session, isAdmin, entrySurveyDone } = useAuth()
  const { t, tRole } = useI18n()
  const [rows, setRows] = useState<Row[] | null>(null)

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    void (async () => {
      const [{ data: profiles }, { data: entries }, { data: exits }] = await Promise.all([
        supabase.from('profiles').select('id, name, role'),
        supabase.from('entry_surveys').select('owner_id, answers'),
        supabase.from('exit_surveys').select('owner_id, answers'),
      ])
      if (cancelled) return
      const entryByOwner = new Map((entries ?? []).map((e) => [e.owner_id, e.answers as EntryAnswers]))
      const exitByOwner = new Map((exits ?? []).map((e) => [e.owner_id, e.answers as ExitAnswers]))
      const list: Row[] = (profiles ?? [])
        .filter((p) => entryByOwner.has(p.id) || exitByOwner.has(p.id))
        .map((p) => ({
          id: p.id,
          name: p.name,
          role: p.role,
          entry: entryByOwner.get(p.id) ?? null,
          exit: exitByOwner.get(p.id) ?? null,
        }))
      setRows(list)
    })()
    return () => {
      cancelled = true
    }
  }, [isAdmin])

  const stats = useMemo(() => {
    const list = rows ?? []
    const entries = list.map((r) => r.entry).filter((x): x is EntryAnswers => !!x)
    const exits = list.map((r) => r.exit).filter((x): x is ExitAnswers => !!x)
    const matched = list.filter((r) => r.entry && r.exit)
    const before = avg(matched.map((r) => r.entry!.prepTimeMinutes))
    const after = avg(matched.map((r) => r.exit!.prepTimeMinutesNow))
    const saved = before !== null && after !== null ? before - after : null
    const savedPct = saved !== null && before ? (saved / before) * 100 : null
    const readiness = avg(entries.map((e) => e.networkReadiness))
    const overallRating = avg(exits.map((e) => e.overallRating))
    const freq = { never: 0, rare: 0, sometimes: 0, often: 0 }
    for (const e of entries) freq[e.networkFrequency]++
    const scales = Object.fromEntries(
      EXIT_SCALE_KEYS.map((k) => [k, avg(exits.map((e) => e[k] as number))]),
    ) as Record<keyof ExitAnswers, number | null>
    return { entries, exits, matched, before, after, saved, savedPct, readiness, overallRating, freq, scales }
  }, [rows])

  if (!session) {
    return <EmptyState title={t('auth.requiredTitle')} description={t('auth.requiredDesc')} />
  }
  if (!isAdmin) {
    return <EmptyState title={t('admin.noAccess')} />
  }
  // Гейт в Layout пропускает /admin без анкеты — но если анкета ещё не пройдена
  // (например, самим исследователем), сессия могла загрузиться раньше проверки.
  if (entrySurveyDone === undefined || rows === null) {
    return (
      <div className="grid place-items-center py-20">
        <Spinner className="text-brand-600" />
      </div>
    )
  }

  const freqTotal = stats.entries.length || 1

  return (
    <div className="space-y-8">
      <div>
        <Link to="/profile" className="text-sm font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400">
          <IconArrowLeft width={14} height={14} className="inline" /> {t('common.home')}
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('admin.title')}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('admin.subtitle')}</p>
          </div>
          <Button onClick={() => downloadCsv(rows)} disabled={rows.length === 0}>
            {t('admin.download')}
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={t('admin.noData')} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label={t('admin.stat.entries')} value={String(stats.entries.length)} />
            <StatCard label={t('admin.stat.exits')} value={String(stats.exits.length)} />
            <StatCard label={t('admin.stat.matched')} value={String(stats.matched.length)} />
            <StatCard label={t('survey.exit.q.overallRating')} value={`★ ${fmt(stats.overallRating)}`} />
          </div>

          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
              {t('admin.section.time')}
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <StatCard label={t('admin.time.before')} value={`${fmt(stats.before, 0)} ${t('admin.time.minutes')}`} />
              <StatCard label={t('admin.time.after')} value={`${fmt(stats.after, 0)} ${t('admin.time.minutes')}`} />
              <StatCard
                label={t('admin.time.saved')}
                value={`${fmt(stats.saved, 0)} ${t('admin.time.minutes')}`}
                hint={stats.savedPct !== null ? `${fmt(stats.savedPct, 0)}%` : undefined}
              />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
              {t('admin.section.readiness')}
            </h2>
            <div className="card space-y-3 p-4">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{fmt(stats.readiness)} / 5</p>
              <div className="flex flex-wrap gap-2 text-xs">
                {(['never', 'rare', 'sometimes', 'often'] as const).map((k) => (
                  <span
                    key={k}
                    className="rounded-full bg-slate-100 px-3 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {t(`survey.entry.frequency.${k}`)}: {stats.freq[k]} (
                    {Math.round((stats.freq[k] / freqTotal) * 100)}%)
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
              {t('admin.section.network')}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {EXIT_SCALE_KEYS.map((k) => (
                <StatCard key={k} label={t(`survey.exit.q.${k}`)} value={`${fmt(stats.scales[k])} / 5`} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
              {t('admin.section.table')}
            </h2>
            <div className="card overflow-x-auto p-0">
              <table className="w-full min-w-[500px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                    <th className="px-4 py-2">{t('admin.table.name')}</th>
                    <th className="px-4 py-2">{t('admin.table.role')}</th>
                    <th className="px-4 py-2">{t('admin.table.entry')}</th>
                    <th className="px-4 py-2">{t('admin.table.exit')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                      <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-200">{r.name}</td>
                      <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{tRole(r.role)}</td>
                      <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                        {r.entry ? t('admin.table.yes') : t('admin.table.no')}
                      </td>
                      <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                        {r.exit ? t('admin.table.yes') : t('admin.table.no')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
