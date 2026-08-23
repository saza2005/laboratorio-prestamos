'use client'

import { Children, useMemo, useState } from 'react'

type ModuleTab = {
  id: string
  label: string
  description: string
}

type ModuleTabsProps = {
  tabs: ModuleTab[]
  children: React.ReactNode
}

export function ModuleTabs({ tabs, children }: ModuleTabsProps) {
  const panels = useMemo(() => Children.toArray(children), [children])
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? '')
  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.id === activeTab))
  const activeDescription = tabs[activeIndex]?.description

  function selectRelativeTab(offset: number) {
    if (tabs.length === 0) return

    const nextIndex = (activeIndex + offset + tabs.length) % tabs.length
    setActiveTab(tabs[nextIndex].id)
  }

  return (
    <section className="space-y-5">
      <div className="surface-card sticky top-2 z-20 overflow-x-auto p-1.5 sm:static sm:p-2">
        <div className="flex min-w-max gap-1" role="tablist" aria-label="Secciones del módulo">
          {tabs.map((tab) => {
            const selected = tab.id === activeTab

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`module-panel-${tab.id}`}
                id={`module-tab-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowRight') {
                    event.preventDefault()
                    selectRelativeTab(1)
                  }

                  if (event.key === 'ArrowLeft') {
                    event.preventDefault()
                    selectRelativeTab(-1)
                  }
                }}
                className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  selected
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-blue-50 hover:text-blue-800'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {activeDescription && (
        <p className="border-l-2 border-blue-300 pl-3 text-sm leading-6 text-slate-600">
          {activeDescription}
        </p>
      )}

      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          id={`module-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`module-tab-${tab.id}`}
          hidden={tab.id !== activeTab}
        >
          {tab.id === activeTab ? panels[index] : null}
        </div>
      ))}
    </section>
  )
}
