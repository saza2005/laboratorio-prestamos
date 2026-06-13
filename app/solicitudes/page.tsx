import { redirect } from 'next/navigation'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import { RequestForm } from './request-form'
import { RequestFormGroups } from './request-form-groups'
import { ItemsCatalog } from './items-catalog'
import { CancelRequestButton } from './cancel-request-button'
import { formatDateTime } from '@/lib/format-date'
import { canCreateGroupRequests } from '@/lib/supabase/auth/roles'
import { LogoutButton } from '@/app/logout-button'
import { INVENTORY_CATALOG_LIMIT } from '@/lib/query-limits'


type RequestItemRow = {
  id: string
  quantity_requested: number
  items:
    | {
        name?: string
        code?: string
      }
    | null
}

type RequestRow = {
  id: string
  status: string
  requested_at: string
  purpose: string | null
  comments: string | null
  scheduled_return_date: string | null
  request_items: RequestItemRow[]
  request_groups: RequestGroupRow[]
}

type RequestGroupItemRow = {
  quantity: number
  items:
    | {
        name?: string
        code?: string
      }
    | null
}

type RequestGroupRow = {
  id: string
  group_name: string
  leader:
    | {
        full_name?: string
      }
    | null
  request_group_items: RequestGroupItemRow[]
}

function getEcuadorDate() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))

  return `${values.year}-${values.month}-${values.day}`
}

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

function formatRequestStatus(status: string) {
  switch (status) {
    case 'pending':
      return 'Pendiente'
    case 'approved':
      return 'Aprobada'
    case 'rejected':
      return 'Rechazada'
    case 'cancelled':
      return 'Cancelada'
    case 'delivered':
      return 'Entregada'
    case 'returned':
      return 'Devuelta'
    case 'partial_return':
      return 'Devolución parcial'
    default:
      return status
  }
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-700'
    case 'approved':
      return 'bg-blue-100 text-blue-700'
    case 'rejected':
      return 'bg-red-100 text-red-700'
    case 'cancelled':
      return 'bg-slate-100 text-slate-700'
    case 'delivered':
      return 'bg-indigo-100 text-indigo-700'
    case 'returned':
      return 'bg-green-100 text-green-700'
    case 'partial_return':
      return 'bg-orange-100 text-orange-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function formatLoanStatus(status: string) {
  switch (status) {
    case 'active':
      return 'Activo'
    case 'returned':
      return 'Devuelto'
    case 'partial_return':
      return 'Devolución parcial'
    case 'overdue':
      return 'Vencido'
    case 'cancelled':
      return 'Cancelado'
    default:
      return status
  }
}

function loanStatusBadgeClass(status: string) {
  switch (status) {
    case 'active':
      return 'bg-blue-100 text-blue-700'
    case 'returned':
      return 'bg-green-100 text-green-700'
    case 'partial_return':
      return 'bg-amber-100 text-amber-700'
    case 'overdue':
      return 'bg-red-100 text-red-700'
    case 'cancelled':
      return 'bg-slate-100 text-slate-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

export default async function SolicitudesPage() {
  let auth

  try {
    auth = await getAuthProfile()
  } catch {
    redirect('/auth/login')
  }

  const { supabase, user, profile } = auth

  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('id, name, code, stock_available, item_type, category')
    .eq('status', 'active')
    .order('name', { ascending: true })
    .limit(INVENTORY_CATALOG_LIMIT)

  if (itemsError) {
    throw new Error(itemsError.message)
  }

  const canCreateGroups = canCreateGroupRequests(profile.role)

  const { data: students, error: studentsError } = canCreateGroups
    ? await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'student')
        .order('full_name', { ascending: true })
        .limit(500)
    : { data: [], error: null }

  if (studentsError) {
    throw new Error(studentsError.message)
  }

  const { data: rawRequests, error: requestsError } = await supabase
    .from('requests')
    .select(`
      id,
      status,
      requested_at,
      purpose,
      comments,
      scheduled_return_date,

      request_items (
        id,
        quantity_requested,
        items (
          name,
          code
        )
      ),

      request_groups (
        id,
        group_name,
        leader_student_id,
        leader:profiles(full_name),
        request_group_items (
          quantity,
          items (
            name,
            code
          )
        )
      )
    `)
    .eq('user_id', user.id)
    .order('requested_at', { ascending: false })
    .limit(50)

  if (requestsError) {
    throw new Error(requestsError.message)
  }

const { data: rawLoans, error: loansError } = await supabase
  .from('loans')
  .select(`
    id,
    status,
    delivery_date,
    expected_return_date,
    returned_at,

    loan_items (
      id,
      quantity,
      returned_quantity,
      damaged_quantity,
      missing_quantity,
      items (
        id,
        name,
        code
      )
    ),

    loan_groups (
      id,
      group_name,
      leader:profiles(full_name),
      loan_group_items (
        quantity,
        items (
          name,
          code
        )
      )
    )
  `)
  .eq('user_id', user.id)
  .order('delivery_date', { ascending: false })
  .limit(50)

if (loansError) {
  throw new Error(loansError.message)
}

const requests: RequestRow[] =
  rawRequests?.map((req) => ({
    id: req.id,
    status: req.status,
    requested_at: req.requested_at,
    purpose: req.purpose,
    comments: req.comments,
    scheduled_return_date: req.scheduled_return_date,
    request_items:
      req.request_items?.map((ri) => ({
        id: ri.id,
        quantity_requested: ri.quantity_requested,
        items: firstOrNull(ri.items),
      })) ?? [],
    request_groups:
      req.request_groups?.map((group) => ({
        id: group.id,
        group_name: group.group_name,
        leader: firstOrNull(group.leader),
        request_group_items:
          group.request_group_items?.map((gi) => ({
            quantity: gi.quantity,
            items: firstOrNull(gi.items),
          })) ?? [],
      })) ?? [],
  })) ?? []

const loans =
  rawLoans?.map((loan) => ({
    id: loan.id,
    status: loan.status,
    delivery_date: loan.delivery_date,
    expected_return_date: loan.expected_return_date,
    returned_at: loan.returned_at,
    loan_items:
      loan.loan_items?.map((li) => {
        const item = firstOrNull(li.items) as
          | {
              id?: string
              name?: string
              code?: string
            }
          | null

        const missingQuantity = li.missing_quantity ?? 0
        const pending =
          li.quantity -
          li.returned_quantity -
          missingQuantity

        return {
          id: li.id,
          quantity: li.quantity,
          returned_quantity: li.returned_quantity,
          damaged_quantity: li.damaged_quantity,
          missing_quantity: missingQuantity,
          pending,
          item,
        }
      }) ?? [],
    loan_groups:
      loan.loan_groups?.map((group) => ({
        id: group.id,
        group_name: group.group_name,
        leader: firstOrNull(group.leader),
        loan_group_items:
          group.loan_group_items?.map((gi) => ({
            quantity: gi.quantity,
            item: firstOrNull(gi.items),
          })) ?? [],
      })) ?? [],

  })) ?? []



  

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Portal de solicitudes</h1>
            <p className="text-slate-600">
              Bienvenido, {profile.full_name}
            </p>
          </div>

          <LogoutButton className="w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-900 sm:w-auto" />
        </div>

        <div className="rounded-lg bg-white p-4 shadow sm:p-6">
          <h2 className="text-xl font-semibold mb-4">
            Crear solicitud individual
          </h2>
          <RequestForm
            items={items ?? []}
            minScheduledReturnDate={getEcuadorDate()}
          />
        </div>

        {canCreateGroups && (
          <div className="rounded-lg bg-white p-4 shadow sm:p-6">
            <h2 className="text-xl font-semibold mb-4">
              Crear solicitud grupal
            </h2>
            <RequestFormGroups
              items={items ?? []}
              students={students ?? []}
            />
          </div>
        )}

        <div className="rounded-lg bg-white p-4 shadow sm:p-6">
          <h2 className="text-xl font-semibold mb-1">
            Mis préstamos
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            Mostrando tus últimos 50 préstamos
          </p>

          <div className="space-y-4">
            {loans.length > 0 ? (
              loans.map((loan) => (
                <div
                  key={loan.id}
                  className="border rounded-xl p-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm text-slate-500">
                        Entregado: {formatDateTime(loan.delivery_date)}
                      </p>

                      <p className="text-sm">
                        <span className="font-medium">Devolución esperada:</span>{' '}
                        {loan.expected_return_date || '-'}
                      </p>
                    </div>

                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${loanStatusBadgeClass(
                        loan.status
                      )}`}
                    >
                      {formatLoanStatus(loan.status)}
                    </span>
                  </div>

                  {loan.loan_groups && loan.loan_groups.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {loan.loan_groups.map((group) => (
                        <div key={group.id} className="border rounded-lg p-3 bg-slate-50">
                          <p className="font-medium text-sm">
                            {group.group_name} - {group.leader?.full_name ?? 'Sin asignar'}
                          </p>

                          <ul className="mt-2 text-sm space-y-1">
                            {group.loan_group_items.map((gi, i) => (
                              <li key={i}>
                                {gi.item?.name ?? 'Ítem'} - {gi.quantity}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4">
                      <div className="space-y-3 md:hidden">
                        {loan.loan_items.map((li) => (
                          <div key={li.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium">{li.item?.name ?? '-'}</p>
                                <p className="text-slate-500">{li.item?.code ?? '-'}</p>
                              </div>
                              <span className="rounded-full bg-white px-2 py-1 text-xs font-medium">
                                Pendiente: {li.pending}
                              </span>
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                              <p><span className="block text-xs text-slate-500">Cantidad</span>{li.quantity}</p>
                              <p><span className="block text-xs text-slate-500">Devuelto</span>{li.returned_quantity}</p>
                              <p><span className="block text-xs text-slate-500">Dañado</span>{li.damaged_quantity}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="hidden overflow-x-auto md:block">
                        <table className="min-w-[720px] text-sm">
                          <thead className="bg-slate-100 text-slate-700">
                            <tr>
                              <th className="text-left px-4 py-3">Ítem</th>
                              <th className="text-left px-4 py-3">Código</th>
                              <th className="text-left px-4 py-3">Cantidad</th>
                              <th className="text-left px-4 py-3">Devuelto</th>
                              <th className="text-left px-4 py-3">Dañado</th>
                              <th className="text-left px-4 py-3">Pendiente</th>
                            </tr>
                          </thead>
                          <tbody>
                            {loan.loan_items.map((li) => (
                              <tr key={li.id} className="border-t">
                                <td className="px-4 py-3">{li.item?.name ?? '-'}</td>
                                <td className="px-4 py-3">{li.item?.code ?? '-'}</td>
                                <td className="px-4 py-3">{li.quantity}</td>
                                <td className="px-4 py-3">{li.returned_quantity}</td>
                                <td className="px-4 py-3">{li.damaged_quantity}</td>
                                <td className="px-4 py-3">{li.pending}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {loan.status === 'active' || loan.status === 'partial_return' ? (
                    <p className="mt-3 text-sm text-slate-600">
                      Debe entregar físicamente estos materiales al laboratorio para
                      que el personal registre la devolución.
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-slate-500">
                No tienes préstamos registrados.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow sm:p-6">
          <h2 className="text-xl font-semibold mb-1">
            Mis solicitudes
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            Mostrando tus últimas 50 solicitudes
          </p>

          <div className="space-y-4">
            {requests.length > 0 ? (
              requests.map((req) => (
                <div
                  key={req.id}
                  className="border rounded-xl p-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <p className="text-sm text-slate-500">
                      {formatDateTime(req.requested_at)}
                    </p>

                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass(
                        req.status
                      )}`}
                    >
                      {formatRequestStatus(req.status)}
                    </span>
                  </div>

                  {req.purpose && (
                    <p className="mt-2 text-sm">
                      <span className="font-medium">Propósito:</span> {req.purpose}
                    </p>
                  )}

                  {req.scheduled_return_date && (
                    <p className="text-sm">
                      <span className="font-medium">Devolución estimada:</span>{' '}
                      {req.scheduled_return_date}
                    </p>
                  )}

                  {req.comments && (
                    <p className="text-sm">
                      <span className="font-medium">Comentarios:</span> {req.comments}
                    </p>
                  )}

                  {req.request_groups && req.request_groups.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {req.request_groups.map((group) => {
                        const leader = firstOrNull(group.leader)

                        return (
                          <div
                            key={group.id}
                            className="border rounded-lg p-3 bg-slate-50"
                          >
                            <p className="font-medium text-sm">
                              {group.group_name} — {leader?.full_name ?? 'Sin asignar'}
                            </p>

                            <ul className="mt-2 text-sm space-y-1">
                              {group.request_group_items.map((gi, index) => {
                                const item = firstOrNull(gi.items)

                                return (
                                  <li key={index}>
                                    {item?.name ?? 'Ítem'} - {gi.quantity}
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <ul className="mt-3 text-sm space-y-1">
                      {req.request_items.map((ri) => (
                        <li key={ri.id}>
                          {ri.items?.name ?? 'Ítem'} - {ri.quantity_requested}
                        </li>
                      ))}
                    </ul>
                  )}
                    {req.status === 'pending' && (
                      <CancelRequestButton requestId={req.id} />
                    )}

                </div>
              ))
            ) : (
              <p className="text-slate-500">
                Aún no tienes solicitudes registradas.
              </p>
            )}
          </div>
        </div>

        <ItemsCatalog items={items ?? []} />
      </div>
    </main>
  )
}