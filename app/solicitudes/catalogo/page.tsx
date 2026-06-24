import Link from 'next/link'
import { ItemsCatalog } from '../items-catalog'
import { getRequestItems, getRequestPortalAuth } from '../shared'

export default async function CatalogoSolicitudesPage() {
  const { supabase } = await getRequestPortalAuth()
  const items = await getRequestItems(supabase)

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <Link href="/solicitudes" className="text-sm font-medium text-blue-700 hover:underline">
            Volver al portal
          </Link>
          <h1 className="mt-3 text-3xl font-bold">Catálogo disponible</h1>
          <p className="mt-1 text-slate-600">Consulta materiales disponibles para solicitud.</p>
        </div>

        <ItemsCatalog items={items} />
      </div>
    </main>
  )
}
