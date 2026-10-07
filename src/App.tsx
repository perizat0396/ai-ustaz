import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { AuthProvider } from '@/lib/auth'
import { StoreProvider } from '@/lib/store'
import { supabaseConfigured } from '@/lib/supabase'
import { Layout } from '@/components/Layout'
import { Home } from '@/pages/Home'
import { Generate } from '@/pages/Generate'
import { Community } from '@/pages/Community'
import { WorkDetail } from '@/pages/WorkDetail'
import { Contribute } from '@/pages/Contribute'
import { Library } from '@/pages/Library'
import { Profile } from '@/pages/Profile'
import { Auth } from '@/pages/Auth'
import { EntrySurvey } from '@/pages/EntrySurvey'
import { ExitSurvey } from '@/pages/ExitSurvey'
import { Admin } from '@/pages/Admin'
import { Textbook } from '@/pages/Textbook'
import { NotFound } from '@/pages/NotFound'

const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        { path: '/', element: <Home /> },
        { path: '/generate', element: <Generate /> },
        { path: '/community', element: <Community /> },
        { path: '/work/:id', element: <WorkDetail /> },
        { path: '/work/:id/contribute', element: <Contribute /> },
        { path: '/library', element: <Library /> },
        { path: '/textbook', element: <Textbook /> },
        { path: '/profile', element: <Profile /> },
        { path: '/login', element: <Auth /> },
        { path: '/signup', element: <Auth /> },
        { path: '/survey/entry', element: <EntrySurvey /> },
        { path: '/survey/exit', element: <ExitSurvey /> },
        { path: '/admin', element: <Admin /> },
        { path: '*', element: <NotFound /> },
      ],
    },
  ],
  // Сайт отдаётся с корня домена ai-ustaz.vku.edu.kz: BASE_URL === '/',
  // пустой basename === корень. Если base сменится, роутер подхватит префикс.
  { basename: import.meta.env.BASE_URL.replace(/\/+$/, '') },
)

function SetupNeeded() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-6 dark:bg-slate-950">
      <div className="max-w-md space-y-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Нужна настройка Supabase</h1>
        <p className="text-slate-600 dark:text-slate-300">
          Скопируйте <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">.env.local.example</code> в{' '}
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">.env.local</code> и вставьте
          URL и anon key вашего проекта Supabase (Project Settings → API), затем перезапустите{' '}
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">npm run dev</code>.
        </p>
      </div>
    </div>
  )
}

export function App() {
  if (!supabaseConfigured) return <SetupNeeded />

  return (
    <I18nProvider>
      <AuthProvider>
        <StoreProvider>
          <RouterProvider router={router} />
        </StoreProvider>
      </AuthProvider>
    </I18nProvider>
  )
}
