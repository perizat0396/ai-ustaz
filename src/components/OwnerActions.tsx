import { useState } from 'react'
import type { Work } from '@/types'
import { useStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { Button } from './ui'
import { IconFile, IconTrash } from './Icon'

/** Управление своей публикацией: снять с публикации (в черновики) или удалить. */
export function OwnerActions({ work, onDone }: { work: Work; onDone?: () => void }) {
  const { deleteWork, unpublishWork } = useStore()
  const { t, tTitle } = useI18n()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (confirmKey: string, action: () => Promise<void>) => {
    if (!confirm(t(confirmKey, { title: tTitle(work.material) }))) return
    setBusy(true)
    setError(null)
    try {
      await action()
      onDone?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => void run('manage.confirmUnpublish', () => unpublishWork(work.id))}
        >
          <IconFile width={14} height={14} /> {t('manage.unpublish')}
        </Button>
        <Button
          size="sm"
          variant="danger"
          disabled={busy}
          onClick={() => void run('manage.confirmDelete', () => deleteWork(work.id))}
        >
          <IconTrash width={14} height={14} /> {t('manage.delete')}
        </Button>
      </div>
      {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  )
}
