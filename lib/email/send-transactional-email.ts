import 'server-only'

import type { createClient } from '@/lib/supabase/server'
import { getAppUrl, getEmailFrom, getResendClient } from './resend'
import { materialsDeliveredTemplate } from './templates/materials-delivered'
import { requestApprovedTemplate } from './templates/request-approved'
import { requestCreatedTemplate } from './templates/request-created'
import { requestRejectedTemplate } from './templates/request-rejected'
import {
  ReturnMaterialSummary,
  returnRegisteredTemplate,
} from './templates/return-registered'
import type { MaterialSummary } from './templates/shared'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

type TransactionalEmailInput =
  | {
      type: 'request-created' | 'request-approved' | 'request-rejected'
      requestId: string
    }
  | {
      type: 'materials-delivered'
      loanId: string
    }
  | {
      type: 'return-registered'
      returnId: string
    }

type RequestEmailDetails = {
  id: string
  purpose: string | null
  scheduled_return_date: string | null
  rejection_reason: string | null
  requester: {
    full_name?: string | null
    email?: string | null
  } | null
  request_items: Array<{
    quantity_requested: number
    quantity_approved: number
    quantity_delivered: number
    items: {
      code?: string | null
      name?: string | null
    } | null
  }>
  request_groups: Array<{
    request_group_items: Array<{
      quantity: number
      items: {
        code?: string | null
        name?: string | null
      } | null
    }>
  }>
}

type LoanEmailDetails = {
  id: string
  request_id: string | null
  expected_return_date: string | null
  borrower: {
    full_name?: string | null
    email?: string | null
  } | null
  loan_items: Array<{
    item_id: string | null
    quantity: number
    item: {
      code?: string | null
      name?: string | null
    } | null
  }>
}

type ReturnEmailDetails = {
  id: string
  received_at: string | null
  notes: string | null
  loan: {
    expected_return_date?: string | null
    status?: string | null
    borrower?: {
      full_name?: string | null
      email?: string | null
    } | null
  } | null
  return_items: Array<{
    quantity_ok: number
    quantity_damaged: number
    quantity_missing: number
    loan_item: {
      item: {
        code?: string | null
        name?: string | null
      } | null
    } | null
  }>
}

export async function sendTransactionalEmail(
  supabase: SupabaseServerClient,
  input: TransactionalEmailInput
) {
  try {
    if (input.type === 'materials-delivered') {
      await sendMaterialsDeliveredEmail(supabase, input.loanId)
      return
    }

    if (input.type === 'return-registered') {
      await sendReturnRegisteredEmail(supabase, input.returnId)
      return
    }

    await sendRequestEmail(supabase, input.type, input.requestId)
  } catch (error) {
    console.error('La operación se completó, pero el correo no pudo enviarse.', {
      type: input.type,
      entityId:
        input.type === 'materials-delivered'
          ? input.loanId
          : input.type === 'return-registered'
            ? input.returnId
            : input.requestId,
      error: error instanceof Error ? error.message : 'Error desconocido',
    })
  }
}

async function sendRequestEmail(
  supabase: SupabaseServerClient,
  type: 'request-created' | 'request-approved' | 'request-rejected',
  requestId: string
) {
  const details = await getRequestDetails(supabase, requestId)
  const recipientEmail = details.requester?.email?.trim()

  if (!recipientEmail) {
    throw new Error('La solicitud no tiene un correo de destinatario.')
  }

  const requesterName =
    details.requester?.full_name?.trim() || recipientEmail
  const requestUrl = `${getAppUrl()}/solicitudes/mis-solicitudes`
  const materials = getRequestMaterials(details, type)
  const template =
    type === 'request-created'
      ? requestCreatedTemplate({
          requesterName,
          requestId: details.id,
          purpose: details.purpose,
          scheduledReturnDate: details.scheduled_return_date,
          materials,
          requestUrl,
        })
      : type === 'request-approved'
        ? requestApprovedTemplate({
            requesterName,
            requestId: details.id,
            purpose: details.purpose,
            scheduledReturnDate: details.scheduled_return_date,
            materials,
            requestUrl,
          })
        : requestRejectedTemplate({
            requesterName,
            requestId: details.id,
            purpose: details.purpose,
            scheduledReturnDate: details.scheduled_return_date,
            rejectionReason: details.rejection_reason,
            requestUrl,
          })

  await sendEmail({
    to: recipientEmail,
    subject: template.subject,
    text: template.text,
    html: template.html,
    eventKey: `${type}:${details.id}`,
  })
}

async function sendMaterialsDeliveredEmail(
  supabase: SupabaseServerClient,
  loanId: string
) {
  const loan = await getLoanDetails(supabase, loanId)
  const recipientEmail = loan.borrower?.email?.trim()

  if (!recipientEmail) {
    throw new Error('El préstamo no tiene un correo de destinatario.')
  }

  const borrowerName = loan.borrower?.full_name?.trim() || recipientEmail
  const requestDetails = loan.request_id
    ? await getRequestDetails(supabase, loan.request_id)
    : null
  const materials = getLoanMaterials(loan)
  const isPartialDelivery = requestDetails
    ? getDeliveredTotal(loan) < getRequestedDeliveryTotal(requestDetails)
    : false
  const template = materialsDeliveredTemplate({
    borrowerName,
    loanId: loan.id,
    expectedReturnDate: loan.expected_return_date,
    materials,
    isPartialDelivery,
    requestUrl: `${getAppUrl()}/solicitudes/mis-prestamos`,
  })

  await sendEmail({
    to: recipientEmail,
    subject: template.subject,
    text: template.text,
    html: template.html,
    eventKey: `loan-delivered:${loan.id}`,
  })
}

async function sendReturnRegisteredEmail(
  supabase: SupabaseServerClient,
  returnId: string
) {
  const returnRecord = await getReturnDetails(supabase, returnId)
  const recipientEmail = returnRecord.loan?.borrower?.email?.trim()

  if (!recipientEmail) {
    throw new Error('La devolución no tiene un correo de destinatario.')
  }

  const borrowerName =
    returnRecord.loan?.borrower?.full_name?.trim() || recipientEmail
  const materials = getReturnMaterials(returnRecord)
  const hasIssues = materials.some(
    (material) => material.quantityDamaged > 0 || material.quantityMissing > 0
  )
  const template = returnRegisteredTemplate({
    borrowerName,
    returnId: returnRecord.id,
    receivedAt: returnRecord.received_at,
    expectedReturnDate: returnRecord.loan?.expected_return_date ?? null,
    materials,
    hasIssues,
    isPartialReturn: returnRecord.loan?.status === 'partial_return' || returnRecord.loan?.status === 'overdue',
    notes: returnRecord.notes,
    requestUrl: `${getAppUrl()}/solicitudes/mis-prestamos`,
  })

  await sendEmail({
    to: recipientEmail,
    subject: template.subject,
    text: template.text,
    html: template.html,
    eventKey: `return-registered:${returnRecord.id}`,
  })
}

async function sendEmail(input: {
  to: string
  subject: string
  text: string
  html: string
  eventKey: string
}) {
  const resend = getResendClient()
  const { error } = await resend.emails.send(
    {
      from: getEmailFrom(),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    },
    {
      idempotencyKey: input.eventKey,
    }
  )

  if (error) {
    throw new Error(error.message)
  }
}

async function getRequestDetails(
  supabase: SupabaseServerClient,
  requestId: string
): Promise<RequestEmailDetails> {
  const { data, error } = await supabase
    .from('requests')
    .select(
      `
      id,
      purpose,
      scheduled_return_date,
      rejection_reason,
      requester:profiles!requests_user_id_fkey(full_name, email),
      request_items(
        quantity_requested,
        quantity_approved,
        quantity_delivered,
        items(code, name)
      ),
      request_groups(
        request_group_items(
          quantity,
          items(code, name)
        )
      )
    `
    )
    .eq('id', requestId)
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'No se pudo cargar la solicitud.')
  }

  const raw = data as unknown as {
    requester?: RequestEmailDetails['requester'] | RequestEmailDetails['requester'][]
    request_items?: RequestEmailDetails['request_items'] | null
    request_groups?: RequestEmailDetails['request_groups'] | null
  } & Omit<RequestEmailDetails, 'requester' | 'request_items' | 'request_groups'>

  return {
    ...raw,
    requester: normalizeRelation(raw.requester),
    request_items: raw.request_items ?? [],
    request_groups: raw.request_groups ?? [],
  }
}

async function getLoanDetails(
  supabase: SupabaseServerClient,
  loanId: string
): Promise<LoanEmailDetails> {
  const { data, error } = await supabase
    .from('loans')
    .select(
      `
      id,
      request_id,
      expected_return_date,
      borrower:profiles!loans_user_id_fkey(full_name, email),
      loan_items(
        item_id,
        quantity,
        item:items(code, name)
      )
    `
    )
    .eq('id', loanId)
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'No se pudo cargar el préstamo.')
  }

  const raw = data as unknown as {
    borrower?: LoanEmailDetails['borrower'] | LoanEmailDetails['borrower'][]
    loan_items?: LoanEmailDetails['loan_items'] | null
  } & Omit<LoanEmailDetails, 'borrower' | 'loan_items'>

  return {
    ...raw,
    borrower: normalizeRelation(raw.borrower),
    loan_items: raw.loan_items ?? [],
  }
}

async function getReturnDetails(
  supabase: SupabaseServerClient,
  returnId: string
): Promise<ReturnEmailDetails> {
  const { data, error } = await supabase
    .from('returns')
    .select(
      `
      id,
      received_at,
      notes,
      loan:loans!returns_loan_id_fkey(
        expected_return_date,
        status,
        borrower:profiles!loans_user_id_fkey(full_name, email)
      ),
      return_items(
        quantity_ok,
        quantity_damaged,
        quantity_missing,
        loan_item:loan_items(
          item:items(code, name)
        )
      )
    `
    )
    .eq('id', returnId)
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'No se pudo cargar la devolución.')
  }

  const raw = data as unknown as {
    loan?: ReturnEmailDetails['loan'] | ReturnEmailDetails['loan'][]
    return_items?: ReturnEmailDetails['return_items'] | null
  } & Omit<ReturnEmailDetails, 'loan' | 'return_items'>

  return {
    ...raw,
    loan: normalizeRelation(raw.loan),
    return_items: raw.return_items ?? [],
  }
}

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function getRequestMaterials(
  details: RequestEmailDetails,
  type: 'request-created' | 'request-approved' | 'request-rejected'
): MaterialSummary[] {
  if (details.request_groups.length > 0) {
    return mergeMaterials(
      details.request_groups.flatMap((group) =>
        group.request_group_items.map((item) => ({
          code: item.items?.code ?? null,
          name: item.items?.name ?? 'Material sin nombre',
          quantity: item.quantity,
        }))
      )
    )
  }

  return details.request_items.map((item) => ({
    code: item.items?.code ?? null,
    name: item.items?.name ?? 'Material sin nombre',
    quantity:
      type === 'request-approved'
        ? item.quantity_approved
        : item.quantity_requested,
  }))
}

function getLoanMaterials(loan: LoanEmailDetails): MaterialSummary[] {
  return mergeMaterials(
    loan.loan_items.map((item) => ({
      code: item.item?.code ?? null,
      name: item.item?.name ?? 'Material sin nombre',
      quantity: item.quantity,
    }))
  )
}

function getReturnMaterials(
  returnRecord: ReturnEmailDetails
): ReturnMaterialSummary[] {
  return returnRecord.return_items.map((item) => ({
    code: item.loan_item?.item?.code ?? null,
    name: item.loan_item?.item?.name ?? 'Material sin nombre',
    quantityOk: item.quantity_ok,
    quantityDamaged: item.quantity_damaged,
    quantityMissing: item.quantity_missing,
  }))
}

function mergeMaterials(materials: MaterialSummary[]) {
  const merged = new Map<string, MaterialSummary>()

  for (const material of materials) {
    const key = `${material.code ?? ''}:${material.name}`
    const existing = merged.get(key)

    if (existing) {
      existing.quantity += material.quantity
    } else {
      merged.set(key, { ...material })
    }
  }

  return [...merged.values()]
}

function getDeliveredTotal(loan: LoanEmailDetails) {
  return loan.loan_items.reduce((total, item) => total + item.quantity, 0)
}

function getRequestedDeliveryTotal(details: RequestEmailDetails) {
  if (details.request_groups.length > 0) {
    return details.request_groups.reduce(
      (total, group) =>
        total +
        group.request_group_items.reduce(
          (groupTotal, item) => groupTotal + item.quantity,
          0
        ),
      0
    )
  }

  return details.request_items.reduce(
    (total, item) => total + item.quantity_approved,
    0
  )
}
