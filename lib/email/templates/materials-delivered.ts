import {
  EmailBody,
  MaterialSummary,
  escapeHtml,
  formatDate,
  renderHtmlLayout,
  renderMaterialsHtml,
  renderMaterialsText,
} from './shared'

type MaterialsDeliveredEmailInput = {
  borrowerName: string
  loanId: string
  expectedReturnDate: string | null
  materials: MaterialSummary[]
  isPartialDelivery: boolean
  requestUrl: string
}

export function materialsDeliveredTemplate(
  input: MaterialsDeliveredEmailInput
): EmailBody {
  const title = input.isPartialDelivery
    ? 'Materiales entregados parcialmente'
    : 'Materiales entregados'

  return {
    subject: input.isPartialDelivery
      ? 'Tu solicitud fue entregada parcialmente'
      : 'Tus materiales fueron entregados',
    text: [
      `Hola ${input.borrowerName},`,
      '',
      input.isPartialDelivery
        ? 'Se registró una entrega parcial de materiales.'
        : 'Se registró la entrega de tus materiales.',
      `Préstamo: ${input.loanId}`,
      `Fecha esperada de devolución: ${formatDate(input.expectedReturnDate)}`,
      '',
      'Materiales entregados:',
      renderMaterialsText(input.materials),
      '',
      `Puedes revisar el detalle en: ${input.requestUrl}`,
    ].join('\n'),
    html: renderHtmlLayout(
      title,
      `
        <p>Hola ${escapeHtml(input.borrowerName)},</p>
        <p>${
          input.isPartialDelivery
            ? 'Se registró una entrega parcial de materiales.'
            : 'Se registró la entrega de tus materiales.'
        }</p>
        <p><strong>Préstamo:</strong> ${escapeHtml(input.loanId)}</p>
        <p><strong>Fecha esperada de devolución:</strong> ${escapeHtml(
          formatDate(input.expectedReturnDate)
        )}</p>
        <p><strong>Materiales entregados:</strong></p>
        ${renderMaterialsHtml(input.materials)}
        <p><a href="${escapeHtml(input.requestUrl)}">Ver mis préstamos</a></p>
      `
    ),
  }
}
