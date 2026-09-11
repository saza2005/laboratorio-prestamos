'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { LinkGoogleButton } from '@/app/auth/link-google-button'
import { LogoutButton } from '@/app/logout-button'
import { formatUserRole, userRoleBadgeClass } from '@/lib/status-format'
import { AppFooter } from './app-footer'
import { AppIcon, type AppIconName } from './app-icon'

type ShellVariant = 'operational' | 'portal'

type NavItem = {
  href: string
  label: string
  icon: AppIconName
  adminOnly?: boolean
  teacherOnly?: boolean
}

const operationalItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/dashboard/solicitudes', label: 'Solicitudes', icon: 'clipboard' },
  { href: '/prestamos', label: 'Préstamos', icon: 'loan' },
  { href: '/devoluciones', label: 'Devoluciones', icon: 'return' },
  { href: '/inventario', label: 'Inventario', icon: 'boxes' },
  { href: '/mantenimiento', label: 'Mantenimiento', icon: 'maintenance' },
  { href: '/dashboard/usuarios', label: 'Usuarios', icon: 'users', adminOnly: true },
  { href: '/dashboard/analitica', label: 'Reportes', icon: 'analytics' },
]

const portalItems: NavItem[] = [
  { href: '/solicitudes', label: 'Inicio', icon: 'dashboard' },
  { href: '/solicitudes/nueva', label: 'Nueva solicitud', icon: 'clipboard' },
  { href: '/solicitudes/grupal', label: 'Solicitud grupal', icon: 'users', teacherOnly: true },
  { href: '/solicitudes/catalogo', label: 'Catálogo', icon: 'boxes' },
  { href: '/solicitudes/mis-solicitudes', label: 'Mis solicitudes', icon: 'book' },
  { href: '/solicitudes/mis-prestamos', label: 'Mis préstamos', icon: 'loan' },
]

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'LP'
}

export function AppShell({ children, userName, role, variant }: { children: ReactNode; userName: string; role: string; variant: ShellVariant }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const items = (variant === 'operational' ? operationalItems : portalItems).filter(
    (item) => (!item.adminOnly || role === 'admin') && (!item.teacherOnly || role === 'teacher')
  )

  function isActive(href: string) {
    if (href === '/dashboard' || href === '/solicitudes') return pathname === href
    return pathname.startsWith(href)
  }

  const navigation = (
    <>
      <div className="app-sidebar-brand">
        <span className="app-brand-mark"><AppIcon name="flask" className="h-5 w-5" /></span>
        {!collapsed && <span><strong>Laboratorio</strong><small>Sistema de Préstamos</small></span>}
      </div>
      <nav className="app-sidebar-nav" aria-label={variant === 'operational' ? 'Navegación operativa' : 'Navegación del portal'}>
        {items.map((item) => (
          <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? 'page' : undefined} className="app-nav-link" onClick={() => setMobileOpen(false)} title={collapsed ? item.label : undefined}>
            <AppIcon name={item.icon} className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>
      <button type="button" className="app-sidebar-collapse" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Expandir navegación' : 'Contraer navegación'}>
        <span aria-hidden="true">{collapsed ? '→' : '←'}</span>{!collapsed && <span>Contraer</span>}
      </button>
    </>
  )

  return (
    <div className={`app-shell ${collapsed ? 'app-shell-collapsed' : ''}`}>
      <aside className="app-sidebar">{navigation}</aside>
      {mobileOpen && <button className="app-sidebar-backdrop" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} />}
      <aside className={`app-sidebar-mobile ${mobileOpen ? 'is-open' : ''}`}>{navigation}</aside>
      <div className="app-shell-body">
        <header className="app-topbar">
          <button type="button" className="app-mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Abrir navegación" aria-expanded={mobileOpen}>
            <AppIcon name="menu" className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{variant === 'operational' ? 'Gestión del laboratorio' : 'Portal de solicitudes'}</p>
            <p className="hidden truncate text-xs text-slate-500 sm:block">Universidad de Cuenca</p>
          </div>
          <div className="app-user-summary">
            <span className="app-avatar" aria-hidden="true">{initials(userName)}</span>
            <span className="hidden min-w-0 lg:block"><strong className="block max-w-44 truncate text-sm">{userName}</strong><span className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${userRoleBadgeClass(role)}`}>{formatUserRole(role)}</span></span>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <LinkGoogleButton className="button-quiet min-h-9 px-3 py-2 text-xs" />
            <LogoutButton className="button-danger min-h-9 px-3 py-2 text-xs" />
          </div>
          <div className="sm:hidden">
            <LogoutButton className="button-danger min-h-9 px-2.5 py-2 text-xs" />
          </div>
        </header>
        <div className="app-shell-content">{children}</div>
        <AppFooter />
      </div>
    </div>
  )
}
