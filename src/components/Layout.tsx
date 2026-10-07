import { Navigate, Outlet, ScrollRestoration, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { Navbar } from './Navbar'

/**
 * Пока вошедший пользователь не отправил входную анкету исследования
 * (Анкета 1), весь остальной сайт недоступен — редирект на /survey/entry.
 * Саму страницу анкеты и вход/регистрацию не блокируем.
 */
function useEntrySurveyGate() {
  const { session, entrySurveyDone } = useAuth()
  const location = useLocation()
  const exempt = ['/survey/entry', '/login', '/signup', '/admin'].includes(location.pathname)
  return session && entrySurveyDone === false && !exempt
}

/** Страницы, доступные гостю без входа. Всё остальное требует авторизации. */
const PUBLIC_PATHS = ['/', '/login', '/signup', '/textbook']

/** Страницы на всю высоту окна под хедером: без отступов и подвала. */
const FULL_SCREEN_PATHS = ['/textbook']

export function Layout() {
  const { t } = useI18n()
  const { session } = useAuth()
  const location = useLocation()
  const mustSurvey = useEntrySurveyGate()
  const isPublic = PUBLIC_PATHS.includes(location.pathname)
  const fullScreen = FULL_SCREEN_PATHS.includes(location.pathname)

  if (!isPublic && session === null) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  if (mustSurvey) return <Navigate to="/survey/entry" replace />

  return (
    <div className={fullScreen ? 'flex h-dvh flex-col' : 'flex min-h-full flex-col'}>
      <Navbar />
      <main className={fullScreen ? 'min-h-0 flex-1' : 'mx-auto w-full max-w-6xl flex-1 px-4 py-8'}>
        {/* Пока сессия загружается, закрытые страницы не показываем. */}
        {isPublic || session ? <Outlet /> : null}
      </main>
      {!fullScreen && (
        <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-400 dark:border-slate-800">
          <p>{t('footer.text')}</p>
        </footer>
      )}
      <ScrollRestoration />
    </div>
  )
}
