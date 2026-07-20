'use client'

import { type ReactNode, useEffect, useRef } from 'react'

type DetailDrawerProps = {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  maxWidthClassName?: string
}

export function DetailDrawer({
  isOpen,
  onClose,
  children,
  maxWidthClassName = 'max-w-3xl',
}: DetailDrawerProps) {
  const panelRef = useRef<HTMLElement | null>(null)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    previousActiveElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key !== 'Tab' || !panelRef.current) return

      const focusableElements = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (!firstElement || !lastElement) {
        event.preventDefault()
        panelRef.current.focus()
        return
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
        return
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    panelRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
      previousActiveElementRef.current?.focus()
      previousActiveElementRef.current = null
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-40 bg-slate-900/40"
      onClick={onClose}
      role="presentation"
    >
      <aside
        ref={panelRef}
        aria-label="Detalle"
        aria-modal="true"
        className={`ml-auto flex h-full w-full flex-col overflow-y-auto bg-white p-4 shadow-2xl outline-none sm:p-6 ${maxWidthClassName}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        tabIndex={-1}
      >
        {children}
      </aside>
    </div>
  )
}
