import {
  EmailBody,
  MaterialSummary,
  escapeHtml,
  formatDate,
  renderHtmlLayout,
  renderMaterialsHtml,
  renderMaterialsText,
} from './shared'

type RequestApprovedEmailInput = {
  requesterName: string
  requestId: string
  purpose: string | null
  scheduledReturnDate: string | null
  materials: MaterialSummary[]
  requestUrl: string
}

export function requestApprovedTemplate(input: RequestApprovedEmailInput): EmailBody {
  const title = 'Solicitud aprobada'
  const purpose = input.purpose || 'No especificado'

  return {
    subject: 'Tu solicitud fue aprobada',
    text: [
      `Hola ${input.requesterName},`,
      '',
      'Tu solicitud fue aprobada.',
      `Solicitud: ${input.requestId}`,
      `Propósito: ${purpose}`,
      `Fecha estimada de devolución: ${formatDate(input.scheduledReturnDate)}`,
      '',
      'Materiales aprobados:',
      renderMaterialsText(input.materials),
      '',
      `Puedes revisar el detalle en: ${input.requestUrl}`,
    ].join('\n'),
    html: renderHtmlLayout(
      title,
      `
        <p>Hola ${escapeHtml(input.requesterName)},</p>
        <p>Tu solicitud fue aprobada.</p>
        <p><strong>Solicitud:</strong> ${escapeHtml(input.requestId)}</p>
        <p><strong>Propósito:</strong> ${escapeHtml(purpose)}</p>
        <p><strong>Fecha estimada de devolución:</strong> ${escapeHtml(
          formatDate(input.scheduledReturnDate)
        )}</p>
        <p><strong>Materiales aprobados:</strong></p>
        ${renderMaterialsHtml(input.materials)}
        <p><a href="${escapeHtml(input.requestUrl)}">Ver mis solicitudes</a></p>
      `
    ),
  }
}
