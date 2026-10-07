import { useCallback, useEffect, useRef } from 'react'
import { useI18n } from '@/lib/i18n'
import { IconDownload } from '@/components/Icon'

/**
 * Учебное пособие — статический HTML из public/uchebnik, встроенный под общий хедер.
 * Язык пособия следует за языком интерфейса, тема — за темой платформы.
 */
export function Textbook() {
  const { t, lang } = useI18n()
  const frame = useRef<HTMLIFrameElement>(null)
  const dir = `${import.meta.env.BASE_URL}uchebnik/`
  const src = dir + (lang === 'kk' ? 'index-kz.html' : 'index.html')
  const pdf = dir + (lang === 'kk' ? 'AI-Ustaz-oqu-quraly-kz.pdf' : 'AI-Ustaz-uchebnoe-posobie.pdf')

  // Пособие открыто с того же домена, поэтому его документ доступен напрямую.
  const syncTheme = useCallback(() => {
    const doc = frame.current?.contentDocument
    if (!doc?.documentElement) return
    const dark = document.documentElement.classList.contains('dark')
    doc.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    const ownToggle = doc.getElementById('themeBtn')
    if (ownToggle) ownToggle.style.display = 'none' // тему переключает хедер платформы
  }, [])

  useEffect(() => {
    const observer = new MutationObserver(syncTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [syncTheme])

  return (
    <div className="flex h-full flex-col">
      <div className="flex justify-end border-b border-slate-200 px-4 py-2 dark:border-slate-800">
        <a
          href={pdf}
          download
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <IconDownload width={15} height={15} />
          {t('textbook.downloadPdf')}
        </a>
      </div>
      <iframe
        ref={frame}
        key={src}
        src={src}
        title={t('nav.textbook')}
        onLoad={syncTheme}
        className="block min-h-0 w-full flex-1 border-0"
      />
    </div>
  )
}
