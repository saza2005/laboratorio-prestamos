import type { ReactNode } from 'react'

export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  meta?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="surface-card mb-6 overflow-hidden">
      <div className="h-1 bg-blue-700" aria-hidden="true" />
      <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
              {eyebrow}
            </p>
          )}
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              {description}
            </p>
          )}
          {meta && <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">{meta}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-col gap-2 sm:flex-row">{actions}</div>}
      </div>
    </header>
  )
}
