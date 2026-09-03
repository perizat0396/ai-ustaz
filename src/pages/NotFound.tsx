import { Link } from 'react-router-dom'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui'

export function NotFound() {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <p className="text-6xl font-black text-brand-200 dark:text-brand-900">404</p>
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('nf.title')}</h1>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{t('nf.desc')}</p>
      <Link to="/">
        <Button>{t('common.home')}</Button>
      </Link>
    </div>
  )
}
