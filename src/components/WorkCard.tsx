import { Link, useNavigate } from 'react-router-dom'
import type { Work } from '@/types'
import { classForType, cx, timeAgo } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { Avatar, Badge } from './ui'
import { TypeIcon } from './TypeIcon'
import { IconBookmark, IconComment, IconFork, IconHeart } from './Icon'

export function WorkCard({ work }: { work: Work }) {
  const { toggleLike, toggleSave } = useStore()
  const { session } = useAuth()
  const navigate = useNavigate()
  const { t, lang, tType, tInst, tGrade, tSubject, tTitle, tSummary } = useI18n()
  const m = work.material

  const guarded = (fn: () => void) => {
    if (!session) {
      navigate('/login')
      return
    }
    fn()
  }

  const c = m.content
  const count =
    c.kind === 'quiz'
      ? t('count.quiz', { n: c.questions.length })
      : c.kind === 'flashcards'
        ? t('count.flashcards', { n: c.cards.length })
        : c.kind === 'assignment'
          ? t('count.assignment', { n: c.tasks.length })
          : c.kind === 'ordering'
            ? t('count.assignment', { n: c.steps.length })
            : c.kind === 'game'
              ? t('count.game', {
                  n: c.pairs?.length ?? c.questions?.length ?? c.rounds?.length ?? 0,
                })
              : c.kind === 'lesson'
                ? t('count.lesson', { n: c.sections.length })
                : c.kind === 'ksp'
                  ? t('count.ksp', { n: 3 })
                  : c.kind === 'course'
                    ? t('count.course', { n: c.steps.length })
                    : t('count.summary', { n: c.keyPoints.length })

  return (
    <article className="card group flex flex-col p-5 transition hover:shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <Badge className={classForType(m.type)}>
          <TypeIcon type={m.type} size={13} />
          {tType(m.type)}
        </Badge>
        <button
          onClick={() => guarded(() => void toggleSave(work.id))}
          className={cx(
            'rounded-lg p-1.5 transition',
            work.savedByMe
              ? 'text-brand-600 dark:text-brand-400'
              : 'text-slate-300 hover:text-slate-500 dark:text-slate-600',
          )}
          aria-label={t('work.save')}
        >
          <IconBookmark width={18} height={18} fill={work.savedByMe ? 'currentColor' : 'none'} />
        </button>
      </div>

      <Link to={`/work/${work.id}`} className="flex-1">
        <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
          {tTitle(m)}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{tSummary(m)}</p>
      </Link>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {m.subject && <Badge>{tSubject(m.subject)}</Badge>}
        {m.grade && (
          <Badge>
            {tInst(m.institution)} · {tGrade(m.grade)}
          </Badge>
        )}
        <Badge>{count}</Badge>
      </div>

      {work.forkedFrom && (
        <p className="mt-3 flex items-center gap-1 text-xs text-slate-400">
          <IconFork width={13} height={13} /> {t('work.forkedFrom')} «{work.forkedFrom.title}»
        </p>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Avatar name={work.author.name} color={work.author.avatarColor} size={26} />
          <div className="leading-tight">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {work.author.name}
            </p>
            <p className="text-[11px] text-slate-400">{timeAgo(work.publishedAt, lang)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <button
            onClick={() => guarded(() => void toggleLike(work.id))}
            className={cx(
              'flex items-center gap-1 transition',
              work.likedByMe ? 'text-rose-500' : 'hover:text-slate-600',
            )}
          >
            <IconHeart width={15} height={15} fill={work.likedByMe ? 'currentColor' : 'none'} />
            {work.likes}
          </button>
          <span className="flex items-center gap-1">
            <IconComment width={15} height={15} />
            {work.comments.length}
          </span>
          <span className="flex items-center gap-1">
            <IconFork width={15} height={15} />
            {work.contributions.length}
          </span>
        </div>
      </div>
    </article>
  )
}
