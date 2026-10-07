import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { MaterialType } from '@/types'
import { cx, SUBJECTS, TYPE_LABELS } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { WorkCard } from '@/components/WorkCard'
import { Button, EmptyState } from '@/components/ui'
import { IconCompass, IconSearch, IconSpark } from '@/components/Icon'

type Sort = 'new' | 'popular' | 'discussed'
const ALL = '__all__'

export function Community() {
  const { works, loadError } = useStore()
  const { t, tType, tSubject } = useI18n()

  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState<string>(ALL)
  const [type, setType] = useState<MaterialType | typeof ALL>(ALL)
  const [sort, setSort] = useState<Sort>('new')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = works.filter((w) => {
      if (subject !== ALL && w.material.subject !== subject) return false
      if (type !== ALL && w.material.type !== type) return false
      if (q) {
        const hay = `${w.material.title} ${w.material.summary} ${w.material.tags.join(' ')} ${w.author.name}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    list = [...list].sort((a, b) => {
      if (sort === 'popular') return b.likes - a.likes
      if (sort === 'discussed') return b.comments.length - a.comments.length
      return b.publishedAt - a.publishedAt
    })
    return list
  }, [works, query, subject, type, sort])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('community.title')}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('community.subtitle', { n: works.length })}
          </p>
        </div>
        <Link to="/generate">
          <Button>
            <IconSpark width={15} height={15} /> {t('common.createMaterial')}
          </Button>
        </Link>
      </div>

      {loadError && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          {loadError}
        </p>
      )}

      {/* Filters */}
      <div className="card space-y-3 p-4">
        <div className="relative">
          {!query && (
            <IconSearch
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              width={16}
              height={16}
            />
          )}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('community.searchPlaceholder')}
            className={query ? 'input-base' : 'input-base pl-9'}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Chip active={subject === ALL} onClick={() => setSubject(ALL)}>
            {t('community.all')}
          </Chip>
          {SUBJECTS.map((s) => (
            <Chip key={s} active={subject === s} onClick={() => setSubject(s)}>
              {tSubject(s)}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Chip active={type === ALL} onClick={() => setType(ALL)}>
              {t('community.allTypes')}
            </Chip>
            {(Object.keys(TYPE_LABELS) as MaterialType[]).map((tp) => (
              <Chip key={tp} active={type === tp} onClick={() => setType(tp)}>
                {tType(tp)}
              </Chip>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="input-base w-auto py-1.5 text-xs"
          >
            <option value="new">{t('community.sortNew')}</option>
            <option value="popular">{t('community.sortPopular')}</option>
            <option value="discussed">{t('community.sortDiscussed')}</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<IconCompass />}
          title={t('community.nothing')}
          description={t('community.nothingDesc')}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery('')
                setSubject(ALL)
                setType(ALL)
              }}
            >
              {t('community.resetFilters')}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((w) => (
            <WorkCard key={w.id} work={w} />
          ))}
        </div>
      )}
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'rounded-full px-3 py-1 text-xs font-medium transition',
        active
          ? 'bg-brand-600 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
      )}
    >
      {children}
    </button>
  )
}
