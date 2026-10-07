import { useId } from 'react'

/** Фирменный знак платформы: скруглённый квадрат с градиентом и буквой U, со звёздочкой в углу. */
export function LogoMark({ size = 32 }: { size?: number }) {
  const gradId = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="29" height="29" rx="9" fill={`url(#${gradId})`} />
      <path
        d="M11 10v7.2a5 5 0 0 0 10 0V10"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M25.5 6.5l.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9.9-2Z"
        fill="#fff"
      />
    </svg>
  )
}
