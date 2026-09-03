import type { ComponentType, SVGProps } from 'react'
import type { MaterialType } from '@/types'
import { cx } from '@/lib/utils'
import {
  IconBookOpen,
  IconCards,
  IconClipboardCheck,
  IconDocPen,
  IconDocText,
  IconPuzzle,
} from './Icon'

const ICON: Record<MaterialType, ComponentType<SVGProps<SVGSVGElement>>> = {
  flashcards: IconCards,
  quiz: IconClipboardCheck,
  assignment: IconDocPen,
  game: IconPuzzle,
  lesson: IconBookOpen,
  summary: IconDocText,
}

const TINT: Record<MaterialType, string> = {
  flashcards: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
  quiz: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
  assignment: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  game: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  lesson: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
  summary: 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-300',
}

/** Голая иконка типа материала (наследует currentColor). */
export function TypeIcon({ type, size = 16 }: { type: MaterialType; size?: number }) {
  const I = ICON[type]
  return <I width={size} height={size} />
}

/** Иконка в мягком цветном скруглённом квадрате (как в справочном дизайне). */
export function TypeIconChip({
  type,
  className,
  iconSize = 22,
}: {
  type: MaterialType
  className?: string
  iconSize?: number
}) {
  const I = ICON[type]
  return (
    <span
      className={cx('grid shrink-0 place-items-center rounded-2xl', TINT[type], className ?? 'size-11')}
    >
      <I width={iconSize} height={iconSize} />
    </span>
  )
}
