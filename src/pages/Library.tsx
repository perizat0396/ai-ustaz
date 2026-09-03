import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Material } from '@/types'
import { classForType, cx, timeAgo } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { WorkCard } from '@/components/WorkCard'
import { MaterialRenderer } from '@/components/MaterialRenderer'
import { TypeIcon } from '@/components/TypeIcon'
import { Badge, Button, EmptyState } from '@/components/ui'
import { IconBookmark, IconFile, IconSpark, IconTrash } from '@/components/Icon'

type Tab = 'saved' | 'drafts'

export function Library() {
  const { works, drafts } = useStore()
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('saved')
  const saved = works.filter((w) => w.savedByMe)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('library.title')}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('library.subtitle')}</p>
      </div>

      <div className="flex gap-2">
        <TabButton active={tab === 'saved'} onClick={() => setTab('saved')}>
          {t('library.savedTab')} ({saved.length})
        </TabButton>
        <TabButton active={tab === 'drafts'} onClick={() => setTab('drafts')}>
          {t('library.draftsTab')} ({drafts.length})
        </TabButton>
      </div>

      {tab === 'saved' &&
        (saved.length === 0 ? (
          <EmptyState
            icon={<IconBookmark />}
            title={t('library.noSaved')}
            description={t('library.noSavedDesc')}
            action={
              <Link to="/community">
                <Button variant="secondary">{t('common.openCommunity')}</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {saved.map((w) => (
              <WorkCard key={w.id} work={w} />
            ))}
          </div>
        ))}

      {tab === 'drafts' &&
        (drafts.length === 0 ? (
          <EmptyState
            icon={<IconFile />}
            title={t('library.noDrafts')}
            description={t('library.noDraftsDesc')}
            action={
              <Link to="/generate">
                <Button>
                  <IconSpark width={15} height={15} /> {t('common.createMaterial')}
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {drafts.map((d) => (
              <DraftCard key={d.id} draft={d} />
            ))}
          </div>
        ))}
    </div>
  )
}

function TabButton({
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
        'rounded-xl px-4 py-2 text-sm font-semibold transition',
        active
          ? 'bg-brand-600 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300',
      )}
    >
      {children}
    </button>
  )
}

function DraftCard({ draft }: { draft: Material }) {
  const { publish, deleteDraft } = useStore()
  const { t, lang, tType, tInst, tGrade, tSubject } = useI18n()
  const [open, setOpen] = useState(false)

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Badge className={classForType(draft.type)}>
            <TypeIcon type={draft.type} size={13} /> {tType(draft.type)}
          </Badge>
          <h3 className="mt-2 font-bold text-slate-900 dark:text-white">{draft.title}</h3>
          <p className="text-xs text-slate-400">
            {tSubject(draft.subject)} · {tInst(draft.institution)} · {tGrade(draft.grade)} ·{' '}
            {draft.engine} · {t('library.createdAgo', { ago: timeAgo(draft.createdAt, lang) })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setOpen((o) => !o)}>
            {open ? t('common.collapse') : t('common.open')}
          </Button>
          <Button size="sm" onClick={() => publish(draft)}>
            {t('common.publish')}
          </Button>
          <button
            onClick={() => deleteDraft(draft.id)}
            className="rounded-lg p-2 text-slate-300 hover:text-rose-500"
            aria-label="×"
          >
            <IconTrash width={16} height={16} />
          </button>
        </div>
      </div>
      {open && (
        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <MaterialRenderer material={draft} />
        </div>
      )}
    </div>
  )
}
