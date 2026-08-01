import {
  EmailBody,
  escapeHtml,
  formatDate,
  renderHtmlLayout,
} from './shared'

export type ReturnMaterialSummary = {
  code: string | null
  name: string
  quantityOk: number
  quantityDamaged: number
  quantityMissing: number
}

type ReturnRegisteredEmailInput = {
  borrowerName: string
  returnId: string
  receivedAt: string | null
  expectedReturnDate: string | null
  materials: ReturnMaterialSummary[]
  hasIssues: boolean
  isPartialReturn: boolean
  notes: string | null
  requestUrl: string
}

export function returnRegisteredTemplate(
  input: ReturnRegisteredEmailInput
): EmailBody {
  const title = input.hasIssues
    ? 'Devolución registrada con observaciones'
    : input.isPartialReturn
      ? 'Devolución parcial registrada'
      : 'Devolución registrada'

  return {
    subject: input.hasIssues
      ? 'Tu devolución fue registrada con observaciones'
      : input.isPartialReturn
        ? 'Tu devolución parcial fue registrada'
        : 'Tu devolución fue registrada',
    text: [
      `Hola ${input.borrowerName},`,
      '',
      input.hasIssues
        ? 'Se registró tu devolución con materiales dañados o faltantes.'
        : input.isPartialReturn
          ? 'Se registró una devolución parcial. Aún quedan materiales pendientes de devolución.'
          : 'Se registró correctamente tu devolución.',
      `Devolución: ${input.returnId}`,
      `Fecha de devolución: ${formatDate(input.receivedAt)}`,
      `Fecha esperada: ${formatDate(input.expectedReturnDate)}`,
      '',
      'Materiales registrados:',
      renderReturnMaterialsText(input.materials),
      input.notes ? `\nObservaciones: ${input.notes}` : '',
      '',
      `Puedes revisar el detalle en: ${input.requestUrl}`,
    ]
      .filter(Boolean)
      .join('\n'),
    html: renderHtmlLayout(
      title,
      `
        <p>Hola ${escapeHtml(input.borrowerName)},</p>
        <p>${
          input.hasIssues
            ? 'Se registró tu devolución con materiales dañados o faltantes.'
            : input.isPartialReturn
              ? 'Se registró una devolución parcial. Aún quedan materiales pendientes de devolución.'
              : 'Se registró correctamente tu devolución.'
        }</p>
        <p><strong>Devolución:</strong> ${escapeHtml(input.returnId)}</p>
        <p><strong>Fecha de devolución:</strong> ${escapeHtml(
          formatDate(input.receivedAt)
        )}</p>
        <p><strong>Fecha esperada:</strong> ${escapeHtml(
          formatDate(input.expectedReturnDate)
        )}</p>
        <p><strong>Materiales registrados:</strong></p>
        ${renderReturnMaterialsHtml(input.materials)}
        ${
          input.notes
            ? `<p><strong>Observaciones:</strong> ${escapeHtml(input.notes)}</p>`
            : ''
        }
        <p><a href="${escapeHtml(input.requestUrl)}">Ver mis préstamos</a></p>
      `
    ),
  }
}

function renderReturnMaterialsHtml(materials: ReturnMaterialSummary[]) {
  if (materials.length === 0) {
    return '<p>No se registraron materiales en el detalle.</p>'
  }

  return `
    <ul>
      ${materials
        .map((material) => `<li>${escapeHtml(formatReturnMaterialLine(material))}</li>`)
        .join('')}
    </ul>
  `
}

function renderReturnMaterialsText(materials: ReturnMaterialSummary[]) {
  if (materials.length === 0) {
    return 'No se registraron materiales en el detalle.'
  }

  return materials
    .map((material) => `- ${formatReturnMaterialLine(material)}`)
    .join('\n')
}

function formatReturnMaterialLine(material: ReturnMaterialSummary) {
  const code = material.code ? `${material.code} - ` : ''
  const quantities = [
    `OK: ${material.quantityOk}`,
    `Dañado: ${material.quantityDamaged}`,
    `Faltante: ${material.quantityMissing}`,
  ].join(' | ')

  return `${code}${material.name} (${quantities})`
}
