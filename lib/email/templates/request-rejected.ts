import {
  EmailBody,
  escapeHtml,
  formatDate,
  renderHtmlLayout,
} from './shared'

type RequestRejectedEmailInput = {
  requesterName: string
  requestId: string
  purpose: string | null
  scheduledReturnDate: string | null
  rejectionReason: string | null
  requestUrl: string
}

export function requestRejectedTemplate(input: RequestRejectedEmailInput): EmailBody {
  const title = 'Solicitud rechazada'
  const purpose = input.purpose || 'No especificado'
  const reason = input.rejectionReason || 'No se especificó un motivo.'

  return {
    subject: 'Tu solicitud fue rechazada',
    text: [
      `Hola ${input.requesterName},`,
      '',
      'Tu solicitud fue rechazada.',
      `Solicitud: ${input.requestId}`,
      `Propósito: ${purpose}`,
      `Fecha estimada de devolución: ${formatDate(input.scheduledReturnDate)}`,
      `Motivo: ${reason}`,
      '',
      `Puedes revisar el detalle en: ${input.requestUrl}`,
    ].join('\n'),
    html: renderHtmlLayout(
      title,
      `
        <p>Hola ${escapeHtml(input.requesterName)},</p>
        <p>Tu solicitud fue rechazada.</p>
        <p><strong>Solicitud:</strong> ${escapeHtml(input.requestId)}</p>
        <p><strong>Propósito:</strong> ${escapeHtml(purpose)}</p>
        <p><strong>Fecha estimada de devolución:</strong> ${escapeHtml(
          formatDate(input.scheduledReturnDate)
        )}</p>
        <p><strong>Motivo:</strong> ${escapeHtml(reason)}</p>
        <p><a href="${escapeHtml(input.requestUrl)}">Ver mis solicitudes</a></p>
      `
    ),
  }
}
