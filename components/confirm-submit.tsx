'use client'

import { type FormEvent, useEffect, useId, useRef, useState } from 'react'

type ConfirmSubmitOptions = {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
}

export function useConfirmSubmit({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
}: ConfirmSubmitOptions) {
  const titleId = useId()
  const confirmedRef = useRef(false)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const formRef = useRef<HTMLFormElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (confirmedRef.current) {
      confirmedRef.current = false
      return
    }

    event.preventDefault()
    formRef.current = event.currentTarget
    setIsOpen(true)
  }

  function close() {
    confirmedRef.current = false
    formRef.current = null
    setIsOpen(false)
  }

  function confirm() {
    const form = formRef.current

    if (!form) {
      close()
      return
    }

    confirmedRef.current = true
    formRef.current = null
    setIsOpen(false)
    window.setTimeout(() => form.requestSubmit(), 0)
  }

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        confirmedRef.current = false
        formRef.current = null
        setIsOpen(false)
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (!firstElement || !lastElement) {
        event.preventDefault()
        dialogRef.current.focus()
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
    dialogRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const dialog = isOpen ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-[2px]"
      onClick={close}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl outline-none"
        onClick={(event) => event.stopPropagation()}
        tabIndex={-1}
      >
        <h2 id={titleId} className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-600">{message}</p>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={close}
            className="button-quiet"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={confirm}
            className="button-primary"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  ) : null

  return { onSubmit, dialog }
}
