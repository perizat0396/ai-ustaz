import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { StoreProvider } from '@/lib/store'
import { Layout } from '@/components/Layout'
import { Home } from '@/pages/Home'
import { Generate } from '@/pages/Generate'
import { Community } from '@/pages/Community'
import { WorkDetail } from '@/pages/WorkDetail'
import { Contribute } from '@/pages/Contribute'
import { Library } from '@/pages/Library'
import { Profile } from '@/pages/Profile'
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
        { path: '/profile', element: <Profile /> },
        { path: '*', element: <NotFound /> },
      ],
    },
  ],
  // На GitHub Pages приложение отдаётся из /ai-ustaz2/ — роутер должен
  // знать этот префикс. В dev BASE_URL === '/', пустой basename === корень.
  { basename: import.meta.env.BASE_URL.replace(/\/+$/, '') },
)

export function App() {
  return (
    <I18nProvider>
      <StoreProvider>
        <RouterProvider router={router} />
      </StoreProvider>
    </I18nProvider>
  )
}
