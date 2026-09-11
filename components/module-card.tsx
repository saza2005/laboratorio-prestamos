import Link from 'next/link'
import { AppIcon, type AppIconName } from './app-icon'

export function ModuleCard({ href, title, description, icon }: { href: string; title: string; description: string; icon: AppIconName }) {
  return (
    <Link href={href} className="module-card">
      <span className="module-card-icon"><AppIcon name={icon} className="h-6 w-6" /></span>
      <span className="min-w-0"><strong>{title}</strong><small>{description}</small></span>
      <span className="module-card-arrow" aria-hidden="true">→</span>
    </Link>
  )
}
