import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { WorkCard } from '@/components/WorkCard'
import { OwnerActions } from '@/components/OwnerActions'
import { useExitSurveyDone } from '@/components/ExitSurveyCard'
import { DraftCard } from '@/pages/Library'
import { Avatar, Button, EmptyState, SectionTitle } from '@/components/ui'
import { IconCheck, IconClipboardCheck, IconEye, IconFork, IconHeart, IconSpark } from '@/components/Icon'

export function Profile() {
  const { works, drafts } = useStore()
  const { session, profile, signOut } = useAuth()
  const { t, tRole } = useI18n()
  const navigate = useNavigate()
  const exitSurveyDone = useExitSurveyDone()

  if (!session) {
    return (
      <EmptyState
        title={t('auth.requiredTitle')}
        description={t('auth.requiredDesc')}
        action={<Button onClick={() => navigate('/login')}>{t('auth.toSignIn')}</Button>}
      />
    )
  }

  if (!profile) return null

  const mine = works.filter((w) => w.author.id === profile.id)

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
        <Avatar name={profile.name} color={profile.avatarColor} size={64} />
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{profile.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{tRole(profile.role)}</p>
          <p className="mt-1 text-xs text-slate-400">{t('profile.memberOf')}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/generate">
            <Button>
              <IconSpark width={15} height={15} /> {t('profile.newMaterial')}
            </Button>
          </Link>
          <Button variant="secondary" onClick={() => void signOut()}>
            {t('auth.signOut')}
          </Button>
        </div>
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
              <div key={w.id} className="flex flex-col gap-2">
                <div className="flex-1">
                  <WorkCard work={w} />
                </div>
                <OwnerActions work={w} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle
          right={
            <Link
              to="/library"
              className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              {t('nav.library')}
            </Link>
          }
        >
          {t('profile.docs')} ({drafts.length})
        </SectionTitle>
        <p className="-mt-2 mb-4 text-xs text-slate-400">{t('profile.docsHint')}</p>
        {drafts.length === 0 ? (
          <EmptyState icon={<IconSpark />} title={t('profile.docsEmpty')} />
        ) : (
          <div className="space-y-4">
            {drafts.map((d) => (
              <DraftCard key={d.id} draft={d} />
            ))}
          </div>
        )}
      </section>

      <section className="card flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
          <IconClipboardCheck width={20} height={20} />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-slate-900 dark:text-white">{t('profile.survey.title')}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('profile.survey.hint')}</p>
        </div>
        <Link to="/survey/exit">
          <Button variant={exitSurveyDone ? 'secondary' : 'primary'}>
            {exitSurveyDone ? (
              <>
                <IconCheck width={15} height={15} /> {t('survey.exit.edit')}
              </>
            ) : (
              t('profile.survey.cta')
            )}
          </Button>
        </Link>
      </section>
    </div>
  )
}
