import type { SVGProps } from 'react'

export type AppIconName =
  | 'analytics'
  | 'archive'
  | 'book'
  | 'boxes'
  | 'clipboard'
  | 'dashboard'
  | 'flask'
  | 'loan'
  | 'maintenance'
  | 'menu'
  | 'return'
  | 'search'
  | 'users'
  | 'x'

const paths: Record<AppIconName, React.ReactNode> = {
  analytics: <><path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19H2"/></>,
  archive: <><path d="M3 6h18"/><path d="M5 6v14h14V6"/><path d="M9 10h6"/><path d="M4 3h16v3H4z"/></>,
  book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5z"/><path d="M4 6.5v13"/></>,
  boxes: <><path d="m12 2 4.5 2.5L12 7 7.5 4.5z"/><path d="m7.5 4.5v5L12 12l4.5-2.5v-5"/><path d="m6.5 12 4.5 2.5L6.5 17 2 14.5z"/><path d="m17.5 12 4.5 2.5-4.5 2.5-4.5-2.5z"/><path d="M2 14.5v5L6.5 22l4.5-2.5v-5M13 14.5v5l4.5 2.5 4.5-2.5v-5"/></>,
  clipboard: <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5M9 10h6M9 14h6"/></>,
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  flask: <><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3"/><path d="M7.5 16h9"/></>,
  loan: <><path d="M4 7h16v12H4z"/><path d="M8 7V5h8v2M8 12h8M12 10v4"/></>,
  maintenance: <><path d="M14.7 6.3a4 4 0 0 0-5-5L12 3.6 8.6 7 6.3 4.7a4 4 0 0 0 5 5L20 18.4 18.4 20l-8.7-8.7"/></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
  return: <><path d="M9 7 4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 6 6"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
  x: <><path d="M18 6 6 18M6 6l12 12"/></>,
}

export function AppIcon({ name, ...props }: { name: AppIconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {paths[name]}
    </svg>
  )
}
