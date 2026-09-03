import { Outlet, ScrollRestoration } from 'react-router-dom'
import { useI18n } from '@/lib/i18n'
import { Navbar } from './Navbar'

export function Layout() {
  const { t } = useI18n()
  return (
    <div className="flex min-h-full flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-400 dark:border-slate-800">
        <p>{t('footer.text')}</p>
      </footer>
      <ScrollRestoration />
    </div>
  )
}
