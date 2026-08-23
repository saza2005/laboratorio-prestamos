type PaginationControlsProps = {
  currentPage: number
  totalPages: number
  onPrevious: () => void
  onNext: () => void
  className?: string
}

export function PaginationControls({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
  className = 'mt-4',
}: PaginationControlsProps) {
  return (
    <div className={`${className} flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between`}>
      <p className="text-sm text-slate-500">
        Página {currentPage} de {totalPages}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <button
          type="button"
          onClick={onPrevious}
          disabled={currentPage === 1}
          className="button-quiet disabled:cursor-not-allowed disabled:opacity-50"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={currentPage === totalPages}
          className="button-quiet disabled:cursor-not-allowed disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}
