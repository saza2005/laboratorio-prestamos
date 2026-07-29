export type EmailBody = {
  subject: string
  text: string
  html: string
}

export type MaterialSummary = {
  code: string | null
  name: string
  quantity: number
}

export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function formatDate(value: string | null | undefined) {
  if (!value) return 'No definida'
  return value
}

export function formatMaterialLine(material: MaterialSummary) {
  const code = material.code ? `${material.code} - ` : ''
  return `${code}${material.name} x ${material.quantity}`
}

export function renderHtmlLayout(title: string, content: string) {
  return `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
      <h1 style="font-size: 20px; margin: 0 0 16px;">${escapeHtml(title)}</h1>
      ${content}
      <p style="margin-top: 24px; color: #64748b; font-size: 13px;">
        Este es un correo automático del sistema de préstamos de laboratorio.
      </p>
    </div>
  `
}

export function renderMaterialsHtml(materials: MaterialSummary[]) {
  if (materials.length === 0) {
    return '<p>No se registraron materiales en el detalle.</p>'
  }

  return `
    <ul>
      ${materials
        .map(
          (material) =>
            `<li>${escapeHtml(formatMaterialLine(material))}</li>`
        )
        .join('')}
    </ul>
  `
}

export function renderMaterialsText(materials: MaterialSummary[]) {
  if (materials.length === 0) return 'No se registraron materiales en el detalle.'
  return materials.map((material) => `- ${formatMaterialLine(material)}`).join('\n')
}
