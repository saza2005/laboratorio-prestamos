import type { ReactNode } from 'react'
import { AppIcon, type AppIconName } from './app-icon'

export function MetricCard({ label, value, tone = 'primary', icon = 'analytics', detail }: { label: string; value: ReactNode; tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'; icon?: AppIconName; detail?: string }) {
  return (
    <article className={`metric-card metric-card-${tone}`}>
      <div className="metric-card-icon"><AppIcon name={icon} className="h-5 w-5" /></div>
      <div className="min-w-0">
        <p className="metric-card-label">{label}</p>
        <p className="metric-card-value">{value}</p>
        {detail && <p className="metric-card-detail">{detail}</p>}
      </div>
    </article>
  )
}
