import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = (props: IconProps): IconProps => ({
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  ...props,
})

export const IconSpark = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
  </svg>
)

export const IconChartBar = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 20V10M10 20V4M16 20v-7M4 20h16" />
  </svg>
)

export const IconCompass = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2 5-5 2 2-5 5-2z" />
  </svg>
)

export const IconLibrary = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 5v14M9 5v14" />
    <path d="M13 6.5 17 5l3 13-4 1.5-3-13z" />
  </svg>
)

export const IconUser = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
  </svg>
)

export const IconHeart = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 20s-7-4.35-9.5-8.5C1 8.5 2.5 5 6 5c2 0 3.2 1.2 4 2.5C10.8 6.2 12 5 14 5c3.5 0 5 3.5 3.5 6.5C19 15.65 12 20 12 20z" />
  </svg>
)

export const IconBookmark = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 4h12v16l-6-4-6 4V4z" />
  </svg>
)

export const IconEye = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

export const IconEyeOff = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.9 3.9M6.6 6.6C3.6 8.5 2 12 2 12s3.5 7 10 7c1.9 0 3.6-.6 5-1.4" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path d="M3 3l18 18" />
  </svg>
)

export const IconComment = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M21 12a8 8 0 0 1-8 8H6l-3 3V6a3 3 0 0 1 3-3h7a8 8 0 0 1 8 8z" />
  </svg>
)

export const IconFork = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="6" cy="5" r="2" />
    <circle cx="18" cy="5" r="2" />
    <circle cx="12" cy="19" r="2" />
    <path d="M6 7v3a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7M12 13v4" />
  </svg>
)

export const IconUpload = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 15V4M8 8l4-4 4 4M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
  </svg>
)

export const IconSearch = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

export const IconPlus = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const IconCheck = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m5 13 4 4L19 7" />
  </svg>
)

export const IconX = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export const IconArrowRight = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

export const IconArrowLeft = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
)

export const IconSun = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5 3.5 3.5M20.5 20.5 19 19M19 5l1.5-1.5M3.5 20.5 5 19" />
  </svg>
)

export const IconMoon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
)

export const IconFile = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14 3v5h5" />
    <path d="M6 3h8l5 5v13H6z" />
  </svg>
)

export const IconDownload = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 4v11M8 11l4 4 4-4M4 20h16" />
  </svg>
)

export const IconTrash = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
  </svg>
)

export const IconEdit = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 20h4L19 9l-4-4L4 16v4z" />
    <path d="M14 6l4 4" />
  </svg>
)

export const IconGlobe = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" />
  </svg>
)

export const IconShuffle = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
  </svg>
)

/* ---- Иконки типов материалов ---- */

export const IconCards = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="7" y="7" width="14" height="14" rx="2.5" />
    <path d="M16 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2" />
    <path d="M11 14h6" />
  </svg>
)

export const IconClipboardCheck = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="5" y="4" width="14" height="17" rx="2.5" />
    <path d="M9 4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V6H9V4.5z" />
    <path d="m8.5 13 2.2 2.2L15 11" />
  </svg>
)

export const IconDocPen = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14 3v4a1 1 0 0 0 1 1h4" />
    <path d="M15 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" />
    <path d="M8 12h4M8 16h3" />
    <path d="m18.5 14.5 2 2-4.5 4.5h-2v-2z" />
  </svg>
)

export const IconPuzzle = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 4.5a2 2 0 1 1 4 0c0 .8-.5 1.5.3 1.5H16a1 1 0 0 1 1 1v2.2c0 .8.7.3 1.5.3a2 2 0 1 1 0 4c-.8 0-1.5-.5-1.5.3V17a1 1 0 0 1-1 1h-2.2c-.8 0-.3.7-.3 1.5a2 2 0 1 1-4 0c0-.8.5-1.5-.3-1.5H7a1 1 0 0 1-1-1v-2.2c0-.8-.7-.3-1.5-.3a2 2 0 1 1 0-4c.8 0 1.5.5 1.5-.3V7a1 1 0 0 1 1-1h2.2c.8 0 .3-.7.3-1.5z" />
  </svg>
)

export const IconBookOpen = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 6.5C10.5 5 8 4.4 4 5v13c4-.6 6.5 0 8 1.5 1.5-1.5 4-2.1 8-1.5V5c-4-.6-6.5 0-8 1.5z" />
    <path d="M12 6.5V20" />
  </svg>
)

export const IconDocText = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14 3v4a1 1 0 0 0 1 1h4" />
    <path d="M6 3h8l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <path d="M8 12h8M8 16h6M8 8h2" />
  </svg>
)

export const IconRotate = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8m0 0V3m0 5h5" />
  </svg>
)
