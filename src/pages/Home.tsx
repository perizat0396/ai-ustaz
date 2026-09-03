import { Link } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { WorkCard } from '@/components/WorkCard'
import { Button, SectionTitle } from '@/components/ui'
import {
  IconArrowRight,
  IconCompass,
  IconFork,
  IconSearch,
  IconSpark,
  IconUpload,
} from '@/components/Icon'

const STEP_ICONS = [IconUpload, IconSearch, IconSpark, IconFork]

export function Home() {
  const { works } = useStore()
  const { t } = useI18n()
  const popular = [...works].sort((a, b) => b.likes - a.likes).slice(0, 3)

  const steps = [1, 2, 3, 4].map((n, i) => ({
    icon: STEP_ICONS[i],
    title: t(`home.step${n}t`),
    text: t(`home.step${n}x`),
  }))

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-brand-600 via-brand-600 to-indigo-800 px-6 py-16 text-center text-white dark:border-slate-800">
        <div className="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_20%_20%,white,transparent_40%),radial-gradient(circle_at_80%_60%,white,transparent_35%)]" />
        <div className="relative mx-auto max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <IconSpark width={14} height={14} /> {t('home.badge')}
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-6xl">
            AI-USTAZ
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-brand-100">{t('home.subtitle')}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/generate">
              <Button size="lg" variant="white">
                <IconSpark width={18} height={18} /> {t('home.ctaCreate')}
              </Button>
            </Link>
            <Link to="/community">
              <Button size="lg" variant="outlineWhite">
                <IconCompass width={18} height={18} /> {t('home.ctaBrowse')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section>
        <SectionTitle>{t('home.how')}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="card p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
                  <Icon width={18} height={18} />
                </span>
                <span className="text-xs font-bold text-slate-300 dark:text-slate-600">0{i + 1}</span>
              </div>
              <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">{title}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Popular works */}
      <section>
        <SectionTitle
          right={
            <Link
              to="/community"
              className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              {t('home.allWorks')} <IconArrowRight width={15} height={15} />
            </Link>
          }
        >
          {t('home.popular')}
        </SectionTitle>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {popular.map((w) => (
            <WorkCard key={w.id} work={w} />
          ))}
        </div>
      </section>
    </div>
  )
}
