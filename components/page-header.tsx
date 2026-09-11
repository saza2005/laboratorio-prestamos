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
    <header className="page-header mb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
              {eyebrow}
            </p>
          )}
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.025em] text-slate-950 sm:text-[1.85rem]">
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
