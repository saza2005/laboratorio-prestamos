type ItemAddedToastProps = {
  itemName: string
}

export function ItemAddedToast({ itemName }: ItemAddedToastProps) {
  if (!itemName) return null

  return (
    <div
      aria-live="polite"
      className="fixed left-4 top-24 z-50 max-w-[calc(100vw-2rem)] rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 shadow-lg sm:max-w-sm"
      role="status"
    >
      <p className="font-medium">Ítem agregado en la parte inferior</p>
      <p className="mt-1 truncate">{itemName}</p>
    </div>
  )
}
