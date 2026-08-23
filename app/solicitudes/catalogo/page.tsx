import Link from 'next/link'
import { ItemsCatalog } from '../items-catalog'
import { getRequestItems, getRequestPortalAuth } from '../shared'
import { PageHeader } from '@/components/page-header'

export default async function CatalogoSolicitudesPage() {
  const { supabase } = await getRequestPortalAuth()
  const items = await getRequestItems(supabase)

  return (
    <main className="app-page">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader eyebrow="Consulta" title="Catálogo disponible" description="Consulta materiales disponibles para tus solicitudes." actions={<Link href="/solicitudes" className="button-secondary">
            Volver al portal
          </Link>} />

        <ItemsCatalog items={items} />
      </div>
    </main>
  )
}
