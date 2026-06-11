'use client'

import { useActionState } from 'react'
import { createMaintenanceWithState } from './actions'

type MaintenanceItem = {
  id: string
  name: string
  code: string
}

export function MaintenanceForm({ items }: { items: MaintenanceItem[] }) {
  const [state, formAction, isPending] = useActionState(
    createMaintenanceWithState,
    { error: null }
  )

  return (
    <form
      action={formAction}
      className="grid gap-4 md:grid-cols-2"
      onSubmit={(event) => {
        if (!confirm('¿Seguro que deseas registrar este mantenimiento?')) {
          event.preventDefault()
        }
      }}
    >
      <select name="item_id" required className="border p-2 rounded">
        <option value="">Seleccione equipo</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} [{item.code}]
          </option>
        ))}
      </select>

      <input
        name="activity"
        placeholder="Actividad realizada"
        required
        className="border p-2 rounded"
      />

      <input
        name="responsible"
        placeholder="Responsable(s)"
        required
        className="border p-2 rounded"
      />

      <input
        name="maintenance_date"
        type="date"
        required
        className="border p-2 rounded"
      />

      <select name="maintenance_type" required className="border p-2 rounded">
        <option value="">Tipo</option>
        <option value="preventive">Preventivo</option>
        <option value="corrective">Correctivo</option>
      </select>

      <textarea
        name="observations"
        placeholder="Observaciones"
        className="border p-2 rounded md:col-span-2"
      />

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {isPending ? 'Guardando...' : 'Guardar'}
        </button>

        {state.error && (
          <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
      </div>
    </form>
  )
}
