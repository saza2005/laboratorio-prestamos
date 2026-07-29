import {
  EmailBody,
  MaterialSummary,
  escapeHtml,
  formatDate,
  renderHtmlLayout,
  renderMaterialsHtml,
  renderMaterialsText,
} from './shared'

type RequestCreatedEmailInput = {
  requesterName: string
  requestId: string
  purpose: string | null
  scheduledReturnDate: string | null
  materials: MaterialSummary[]
  requestUrl: string
}

export function requestCreatedTemplate(input: RequestCreatedEmailInput): EmailBody {
  const title = 'Solicitud registrada'
  const purpose = input.purpose || 'No especificado'

  return {
    subject: 'Solicitud registrada en el laboratorio',
    text: [
      `Hola ${input.requesterName},`,
      '',
      'Tu solicitud fue registrada correctamente.',
      `Solicitud: ${input.requestId}`,
      `Propósito: ${purpose}`,
      `Fecha estimada de devolución: ${formatDate(input.scheduledReturnDate)}`,
      '',
      'Materiales:',
      renderMaterialsText(input.materials),
      '',
      `Puedes revisar el estado en: ${input.requestUrl}`,
    ].join('\n'),
    html: renderHtmlLayout(
      title,
      `
        <p>Hola ${escapeHtml(input.requesterName)},</p>
        <p>Tu solicitud fue registrada correctamente.</p>
        <p><strong>Solicitud:</strong> ${escapeHtml(input.requestId)}</p>
        <p><strong>Propósito:</strong> ${escapeHtml(purpose)}</p>
        <p><strong>Fecha estimada de devolución:</strong> ${escapeHtml(
          formatDate(input.scheduledReturnDate)
        )}</p>
        <p><strong>Materiales:</strong></p>
        ${renderMaterialsHtml(input.materials)}
        <p><a href="${escapeHtml(input.requestUrl)}">Ver mis solicitudes</a></p>
      `
    ),
  }
}
