'use client'

import { useActionState } from 'react'
import { createItemWithState } from './actions'

export function ItemForm() {
  const [state, formAction, isPending] = useActionState(createItemWithState, {
    error: null,
  })

  return (
    <form
      action={formAction}
      className="grid gap-4 md:grid-cols-2"
      onSubmit={(event) => {
        if (!confirm('¿Seguro que deseas agregar este ítem al inventario?')) {
          event.preventDefault()
        }
      }}
    >
      <div>
        <label className="block text-sm font-medium mb-1">Código</label>
        <input
          name="code"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="BAN-001"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Nombre</label>
        <input
          name="name"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="Bandeja"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Descripción</label>
        <input
          name="description"
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="Descripción del ítem"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Categoría</label>
        <input
          name="category"
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="Materiales / Equipos / Herramientas"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Tipo</label>
        <select
          name="item_type"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        >
          <option value="">Seleccione</option>
          <option value="consumable">Consumible</option>
          <option value="equipment">Equipo</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Estado</label>
        <select
          name="status"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        >
          <option value="">Seleccione</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
          <option value="maintenance">Mantenimiento</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Stock total</label>
        <input
          name="stock_total"
          type="number"
          min="0"
          defaultValue="0"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Stock disponible</label>
        <input
          name="stock_available"
          type="number"
          min="0"
          defaultValue="0"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Ubicación</label>
        <input
          name="location"
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="Estante A"
        />
      </div>

      <div className="flex items-center gap-2 md:mt-6">
        <input
          id="track_individual"
          name="track_individual"
          type="checkbox"
          className="h-4 w-4"
        />
        <label htmlFor="track_individual" className="text-sm font-medium">
          Seguimiento individual
        </label>
      </div>

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {isPending ? 'Guardando...' : 'Guardar ítem'}
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
