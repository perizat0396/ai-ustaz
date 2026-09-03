import { Link } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { WorkCard } from '@/components/WorkCard'
import { Avatar, Button, EmptyState, SectionTitle } from '@/components/ui'
import { IconEye, IconFork, IconHeart, IconSpark, IconTrash } from '@/components/Icon'

export function Profile() {
  const { user, works, drafts, reset } = useStore()
  const { t } = useI18n()
  const mine = works.filter((w) => w.author.id === user.id)

  const totalLikes = mine.reduce((a, w) => a + w.likes, 0)
  const totalViews = mine.reduce((a, w) => a + w.views, 0)
  const totalContrib = mine.reduce((a, w) => a + w.contributions.length, 0)

  const stats = [
    { label: t('profile.stat.pubs'), value: mine.length, icon: IconSpark },
    { label: t('profile.stat.likes'), value: totalLikes, icon: IconHeart },
    { label: t('profile.stat.views'), value: totalViews, icon: IconEye },
    { label: t('profile.stat.contribs'), value: totalContrib, icon: IconFork },
  ]

  return (
    <div className="space-y-8">
      <div className="card flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
        <Avatar name={user.name} color={user.avatarColor} size={64} />
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{user.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{user.role}</p>
          <p className="mt-1 text-xs text-slate-400">{t('profile.memberOf')}</p>
        </div>
        <Link to="/generate">
          <Button>
            <IconSpark width={15} height={15} /> {t('profile.newMaterial')}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-4">
            <Icon className="text-brand-500" width={18} height={18} />
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
            <p className="text-xs text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      <section>
        <SectionTitle
          right={
            <Link
              to="/library"
              className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              {t('profile.drafts')} ({drafts.length})
            </Link>
          }
        >
          {t('profile.myPublications')}
        </SectionTitle>
        {mine.length === 0 ? (
          <EmptyState
            icon={<IconSpark />}
            title={t('profile.nothing')}
            description={t('profile.nothingDesc')}
            action={
              <Link to="/generate">
                <Button>{t('common.createMaterial')}</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mine.map((w) => (
              <WorkCard key={w.id} work={w} />
            ))}
          </div>
        )}
      </section>

      <section className="card border-rose-200 p-5 dark:border-rose-900/50">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{t('profile.demoTitle')}</p>
        <p className="mt-1 text-xs text-slate-400">{t('profile.demoDesc')}</p>
        <Button
          variant="danger"
          size="sm"
          className="mt-3"
          onClick={() => {
            if (confirm(t('profile.confirmReset'))) reset()
          }}
        >
          <IconTrash width={14} height={14} /> {t('profile.resetDemo')}
        </Button>
      </section>
    </div>
  )
}
