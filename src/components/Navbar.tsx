import { NavLink, Link } from 'react-router-dom'
import { cx } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/hooks/useTheme'
import { Avatar, Button } from './ui'
import { IconCompass, IconLibrary, IconMoon, IconSpark, IconSun, IconUser } from './Icon'

const links = [
  { to: '/generate', key: 'nav.generate', icon: IconSpark },
  { to: '/community', key: 'nav.community', icon: IconCompass },
  { to: '/library', key: 'nav.library', icon: IconLibrary },
  { to: '/profile', key: 'nav.profile', icon: IconUser },
] as const

export function Navbar() {
  const { user } = useStore()
  const { theme, toggle } = useTheme()
  const { t, lang, setLang } = useI18n()

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-white">
            <IconSpark width={18} height={18} />
          </span>
          <span className="text-slate-900 dark:text-white">
            AI <span className="text-brand-600 dark:text-brand-400">Ustaz</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map(({ to, key, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                )
              }
            >
              <Icon width={16} height={16} />
              {t(key)}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Переключатель языка интерфейса */}
          <div
            className="flex overflow-hidden rounded-lg border border-slate-200 text-xs font-semibold dark:border-slate-700"
            role="group"
            aria-label={t('nav.uiLang')}
          >
            {(['kk', 'ru'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={cx(
                  'px-2 py-1 transition',
                  lang === l
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800',
                )}
              >
                {l === 'kk' ? 'ҚАЗ' : 'РУС'}
              </button>
            ))}
          </div>

          <button
            onClick={toggle}
            className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label={t('nav.toggleTheme')}
          >
            {theme === 'dark' ? <IconSun width={18} height={18} /> : <IconMoon width={18} height={18} />}
          </button>

          <Link to="/generate" className="hidden sm:block">
            <Button size="sm">
              <IconSpark width={15} height={15} />
              {t('nav.create')}
            </Button>
          </Link>

          <Link to="/profile" className="flex items-center gap-2">
            <Avatar name={user.name} color={user.avatarColor} size={32} />
          </Link>
        </div>
      </div>

      {/* мобильная навигация */}
      <nav className="flex items-center justify-around border-t border-slate-200 px-2 py-1 md:hidden dark:border-slate-800">
        {links.map(({ to, key, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cx(
                'flex flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] font-medium',
                isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400',
              )
            }
          >
            <Icon width={18} height={18} />
            {t(key)}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
