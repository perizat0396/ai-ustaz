import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { classForType, cx, formatDate, timeAgo } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { MaterialRenderer } from '@/components/MaterialRenderer'
import { TypeIcon } from '@/components/TypeIcon'
import { Avatar, Badge, Button, EmptyState } from '@/components/ui'
import {
  IconBookmark,
  IconCheck,
  IconComment,
  IconEye,
  IconFile,
  IconFork,
  IconHeart,
  IconSearch,
} from '@/components/Icon'

export function WorkDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { getWork, toggleLike, toggleSave, addComment, addView, user } = useStore()
  const { t, lang, tType, tInst, tLang, tDiff, tSubject, tGrade } = useI18n()
  const work = getWork(id)

  const viewed = useRef(false)
  useEffect(() => {
    if (work && !viewed.current) {
      viewed.current = true
      addView(work.id)
    }
  }, [work, addView])

  const [comment, setComment] = useState('')

  if (!work) {
    return (
      <EmptyState
        title={t('work.notFound')}
        description={t('work.notFoundDesc')}
        action={<Button onClick={() => navigate('/community')}>{t('work.backToCommunity')}</Button>}
      />
    )
  }

  const m = work.material

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        to="/community"
        className="text-sm font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400"
      >
        ← {t('nav.community')}
      </Link>

      {work.forkedFrom && (
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <IconFork width={13} height={13} /> {t('work.forkedFrom')}{' '}
          <Link to={`/work/${work.forkedFrom.id}`} className="font-medium text-brand-600 hover:underline">
            «{work.forkedFrom.title}»
          </Link>{' '}
          · {work.forkedFrom.author}
        </p>
      )}

      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge className={classForType(m.type)}>
              <TypeIcon type={m.type} size={13} /> {tType(m.type)}
            </Badge>
            <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{m.title}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{m.summary}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <Badge>{tSubject(m.subject)}</Badge>
          <Badge>
            {tInst(m.institution)} · {tGrade(m.grade)}
          </Badge>
          <Badge>{tLang(m.language)}</Badge>
          <Badge>
            {t('work.difficultyPrefix')}: {tDiff(m.difficulty)}
          </Badge>
          <Badge
            className={
              m.engine?.startsWith('Ollama')
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                : undefined
            }
          >
            {m.engine ?? t('engine.demo')}
          </Badge>
          {m.tags.slice(0, 5).map((tag) => (
            <Badge key={tag}>#{tag}</Badge>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Avatar name={work.author.name} color={work.author.avatarColor} size={40} />
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {work.author.name}
              </p>
              <p className="text-xs text-slate-400">
                {work.author.role} · {formatDate(work.publishedAt, lang)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={work.likedByMe ? 'primary' : 'secondary'}
              onClick={() => toggleLike(work.id)}
            >
              <IconHeart width={15} height={15} fill={work.likedByMe ? 'currentColor' : 'none'} />
              {work.likes}
            </Button>
            <Button
              size="sm"
              variant={work.savedByMe ? 'primary' : 'secondary'}
              onClick={() => toggleSave(work.id)}
            >
              <IconBookmark width={15} height={15} fill={work.savedByMe ? 'currentColor' : 'none'} />
              {work.savedByMe ? t('work.saved') : t('work.save')}
            </Button>
            <Link to={`/work/${work.id}/contribute`}>
              <Button size="sm">
                <IconFork width={15} height={15} /> {t('work.contribute')}
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-3 flex gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <IconEye width={14} height={14} /> {t('work.views', { n: work.views })}
          </span>
          <span className="flex items-center gap-1">
            <IconComment width={14} height={14} /> {t('work.comments', { n: work.comments.length })}
          </span>
          <span className="flex items-center gap-1">
            <IconFork width={14} height={14} /> {t('work.contributions', { n: work.contributions.length })}
          </span>
        </div>
      </div>

      <MaterialRenderer material={m} />

      {m.sources.length > 0 && (
        <div className="card p-5">
          <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
            {t('work.sources')} ({m.sources.length})
          </p>
          <ul className="space-y-2">
            {m.sources.map((s) => (
              <li key={s.id} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 text-slate-400">
                  {s.kind === 'search' ? (
                    <IconSearch width={15} height={15} />
                  ) : (
                    <IconFile width={15} height={15} />
                  )}
                </span>
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{s.title}</p>
                  <p className="text-xs text-slate-400">{s.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card p-5">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <IconFork width={16} height={16} /> {t('work.contribTitle')}
        </p>
        {work.contributions.length === 0 ? (
          <p className="text-sm text-slate-400">{t('work.noContrib')}</p>
        ) : (
          <ul className="space-y-3">
            {work.contributions.map((c) => (
              <li key={c.id} className="flex gap-3">
                <Avatar name={c.author.name} color={c.author.avatarColor} size={32} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {c.author.name}
                    </span>
                    <span
                      className={cx(
                        'rounded-full px-2 py-0.5 text-[11px] font-medium',
                        c.status === 'merged'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
                      )}
                    >
                      {c.status === 'merged' ? (
                        <span className="flex items-center gap-1">
                          <IconCheck width={11} height={11} /> {t('work.merged')}
                        </span>
                      ) : (
                        t('work.pending')
                      )}
                    </span>
                    <span className="text-xs text-slate-400">{timeAgo(c.createdAt, lang)}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{c.note}</p>
                  <p className="text-xs text-slate-400">{t('work.plusItems', { n: c.addedItems })}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-5">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <IconComment width={16} height={16} /> {t('work.commentsTitle')} ({work.comments.length})
        </p>

        <div className="mb-4 flex gap-3">
          <Avatar name={user.name} color={user.avatarColor} size={32} />
          <div className="flex-1">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder={t('work.commentPlaceholder')}
              className="input-base resize-none"
            />
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                disabled={!comment.trim()}
                onClick={() => {
                  addComment(work.id, comment.trim())
                  setComment('')
                }}
              >
                {t('common.send')}
              </Button>
            </div>
          </div>
        </div>

        {work.comments.length === 0 ? (
          <p className="text-sm text-slate-400">{t('work.noComments')}</p>
        ) : (
          <ul className="space-y-4">
            {work.comments.map((c) => (
              <li key={c.id} className="flex gap-3">
                <Avatar name={c.author.name} color={c.author.avatarColor} size={32} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {c.author.name}
                    </span>
                    <span className="text-xs text-slate-400">{timeAgo(c.createdAt, lang)}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{c.body}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
