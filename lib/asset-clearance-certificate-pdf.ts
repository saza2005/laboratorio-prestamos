import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'

export type AssetClearanceDocumentSnapshot = {
  document_version: string
  institution: {
    name: string
    laboratory: string
  }
  certificate: {
    id: string
    code: string
    issued_at: string
    approved_at: string
  }
  applicant: {
    id: string
    full_name: string
    email: string
    role: string
    career: string | null
  }
  loan_history: {
    total_loans: number
    total_units_loaned: number
    distinct_items_used: number
    last_loan_at: string | null
  }
  signatory: {
    name: string
    title: string
    signature_method: string
  }
}

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN_X = 58
const TEXT_WIDTH = PAGE_WIDTH - MARGIN_X * 2
const BLUE = rgb(0.08, 0.25, 0.48)
const SLATE = rgb(0.16, 0.22, 0.31)
const MUTED = rgb(0.39, 0.45, 0.55)
const BORDER = rgb(0.82, 0.85, 0.89)
const SURFACE = rgb(0.96, 0.97, 0.98)

function requiredString(record: Record<string, unknown>, key: string) {
  const value = record[key]
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`El snapshot documental no contiene ${key}.`)
  }
  return value.trim()
}

function requiredRecord(record: Record<string, unknown>, key: string) {
  const value = record[key]
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`El snapshot documental no contiene ${key}.`)
  }
  return value as Record<string, unknown>
}

function nonNegativeNumber(record: Record<string, unknown>, key: string) {
  const value = Number(record[key])
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`El snapshot documental contiene un valor inválido para ${key}.`)
  }
  return value
}

export function parseAssetClearanceDocumentSnapshot(value: unknown): AssetClearanceDocumentSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('El snapshot documental no es válido.')
  }

  const snapshot = value as Record<string, unknown>
  const institution = requiredRecord(snapshot, 'institution')
  const certificate = requiredRecord(snapshot, 'certificate')
  const applicant = requiredRecord(snapshot, 'applicant')
  const loanHistory = requiredRecord(snapshot, 'loan_history')
  const signatory = requiredRecord(snapshot, 'signatory')
  const career = applicant.career
  const lastLoanAt = loanHistory.last_loan_at

  if (career !== null && career !== undefined && typeof career !== 'string') {
    throw new Error('El snapshot documental contiene una carrera inválida.')
  }
  if (lastLoanAt !== null && lastLoanAt !== undefined && typeof lastLoanAt !== 'string') {
    throw new Error('El snapshot documental contiene una fecha de préstamo inválida.')
  }

  const parsed = {
    document_version: requiredString(snapshot, 'document_version'),
    institution: {
      name: requiredString(institution, 'name'),
      laboratory: requiredString(institution, 'laboratory'),
    },
    certificate: {
      id: requiredString(certificate, 'id'),
      code: requiredString(certificate, 'code'),
      issued_at: requiredString(certificate, 'issued_at'),
      approved_at: requiredString(certificate, 'approved_at'),
    },
    applicant: {
      id: requiredString(applicant, 'id'),
      full_name: requiredString(applicant, 'full_name'),
      email: requiredString(applicant, 'email'),
      role: requiredString(applicant, 'role'),
      career: typeof career === 'string' && career.trim() ? career.trim() : null,
    },
    loan_history: {
      total_loans: nonNegativeNumber(loanHistory, 'total_loans'),
      total_units_loaned: nonNegativeNumber(loanHistory, 'total_units_loaned'),
      distinct_items_used: nonNegativeNumber(loanHistory, 'distinct_items_used'),
      last_loan_at: typeof lastLoanAt === 'string' && lastLoanAt.trim() ? lastLoanAt : null,
    },
    signatory: {
      name: requiredString(signatory, 'name'),
      title: requiredString(signatory, 'title'),
      signature_method: requiredString(signatory, 'signature_method'),
    },
  } satisfies AssetClearanceDocumentSnapshot

  if (!/^LM-\d{4}-\d{6}$/.test(parsed.certificate.code)) {
    throw new Error('El código del certificado no es válido.')
  }

  return parsed
}

function formatPdfDate(value: string | null) {
  if (!value) return 'No registra'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No registra'
  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'long',
    timeZone: 'America/Guayaquil',
  }).format(date)
}

function formatRole(role: string) {
  if (role === 'admin') return 'Administrador'
  if (role === 'lab_staff') return 'Laboratorista'
  if (role === 'teacher') return 'Docente'
  if (role === 'student') return 'Estudiante'
  return role
}

function safePdfText(value: string) {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '?')
}

function centeredX(font: PDFFont, text: string, size: number) {
  return (PAGE_WIDTH - font.widthOfTextAtSize(text, size)) / 2
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = safePdfText(text).split(/\s+/)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

function drawWrappedText(
  page: PDFPage,
  text: string,
  options: { x: number; y: number; width: number; font: PDFFont; size: number; lineHeight: number }
) {
  const lines = wrapText(text, options.font, options.size, options.width)
  lines.forEach((line, index) => {
    page.drawText(line, {
      x: options.x,
      y: options.y - index * options.lineHeight,
      size: options.size,
      font: options.font,
      color: SLATE,
    })
  })
  return options.y - lines.length * options.lineHeight
}

function drawLabelValue(page: PDFPage, fonts: { regular: PDFFont; bold: PDFFont }, label: string, value: string, y: number) {
  page.drawText(safePdfText(label), { x: MARGIN_X + 16, y, size: 9, font: fonts.bold, color: MUTED })
  page.drawText(safePdfText(value), { x: MARGIN_X + 132, y, size: 10.5, font: fonts.regular, color: SLATE })
}

export async function generateAssetClearanceCertificatePdf(snapshot: AssetClearanceDocumentSnapshot) {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const fonts = { regular, bold }

  pdf.setTitle(`Certificado de no adeudo ${snapshot.certificate.code}`)
  pdf.setAuthor(snapshot.institution.name)
  pdf.setSubject('Certificado de no adeudar bienes institucionales')
  pdf.setCreator('Sistema de Gestión de Préstamos del Laboratorio de Máquinas')
  const issuedDate = new Date(snapshot.certificate.issued_at)
  if (!Number.isNaN(issuedDate.getTime())) {
    pdf.setCreationDate(issuedDate)
    pdf.setModificationDate(issuedDate)
  }

  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 12, width: PAGE_WIDTH, height: 12, color: BLUE })
  const institution = safePdfText(snapshot.institution.name.toUpperCase())
  const laboratory = safePdfText(snapshot.institution.laboratory.toUpperCase())
  page.drawText(institution, { x: centeredX(bold, institution, 16), y: 778, size: 16, font: bold, color: BLUE })
  page.drawText(laboratory, { x: centeredX(bold, laboratory, 12), y: 756, size: 12, font: bold, color: SLATE })
  page.drawLine({ start: { x: MARGIN_X, y: 738 }, end: { x: PAGE_WIDTH - MARGIN_X, y: 738 }, thickness: 1, color: BORDER })

  const title = 'CERTIFICADO DE NO ADEUDAR BIENES'
  page.drawText(title, { x: centeredX(bold, title, 15), y: 700, size: 15, font: bold, color: BLUE })
  page.drawText(`Código: ${snapshot.certificate.code}`, { x: MARGIN_X, y: 674, size: 9.5, font: bold, color: MUTED })
  const issueText = `Fecha de emisión: ${formatPdfDate(snapshot.certificate.issued_at)}`
  page.drawText(safePdfText(issueText), {
    x: PAGE_WIDTH - MARGIN_X - regular.widthOfTextAtSize(safePdfText(issueText), 9.5),
    y: 674,
    size: 9.5,
    font: regular,
    color: MUTED,
  })

  page.drawRectangle({ x: MARGIN_X, y: 555, width: TEXT_WIDTH, height: 96, color: SURFACE, borderColor: BORDER, borderWidth: 0.8 })
  drawLabelValue(page, fonts, 'Nombre completo', snapshot.applicant.full_name, 627)
  drawLabelValue(page, fonts, 'Correo institucional', snapshot.applicant.email, 607)
  drawLabelValue(page, fonts, 'Rol', formatRole(snapshot.applicant.role), 587)
  drawLabelValue(page, fonts, 'Carrera', snapshot.applicant.career ?? 'No registrada', 567)

  const institutionalText = `Luego de revisar los registros administrativos del Sistema de Gestión de Préstamos del ${snapshot.institution.laboratory}, se certifica que ${snapshot.applicant.full_name} no mantiene bienes pendientes ni obligaciones pendientes con el laboratorio a la fecha de emisión de este documento.`
  const afterStatement = drawWrappedText(page, institutionalText, {
    x: MARGIN_X,
    y: 522,
    width: TEXT_WIDTH,
    font: regular,
    size: 11,
    lineHeight: 17,
  })

  const summaryTop = afterStatement - 18
  page.drawText('RESUMEN HISTÓRICO', { x: MARGIN_X, y: summaryTop, size: 10, font: bold, color: BLUE })
  page.drawRectangle({ x: MARGIN_X, y: summaryTop - 86, width: TEXT_WIDTH, height: 68, color: SURFACE, borderColor: BORDER, borderWidth: 0.8 })
  drawLabelValue(page, fonts, 'Préstamos realizados', String(snapshot.loan_history.total_loans), summaryTop - 38)
  drawLabelValue(page, fonts, 'Bienes utilizados', `${snapshot.loan_history.total_units_loaned} unidades`, summaryTop - 57)
  drawLabelValue(page, fonts, 'Último préstamo', formatPdfDate(snapshot.loan_history.last_loan_at), summaryTop - 76)

  const signatureLineY = 170
  page.drawLine({ start: { x: 177, y: signatureLineY }, end: { x: 418, y: signatureLineY }, thickness: 0.8, color: SLATE })
  const signatoryName = safePdfText(snapshot.signatory.name)
  const signatoryTitle = safePdfText(snapshot.signatory.title)
  page.drawText(signatoryName, { x: centeredX(bold, signatoryName, 11), y: 151, size: 11, font: bold, color: SLATE })
  page.drawText(signatoryTitle, { x: centeredX(regular, signatoryTitle, 10), y: 135, size: 10, font: regular, color: MUTED })
  page.drawText('Firma física del responsable', { x: centeredX(regular, 'Firma física del responsable', 8.5), y: 117, size: 8.5, font: regular, color: MUTED })

  page.drawLine({ start: { x: MARGIN_X, y: 80 }, end: { x: PAGE_WIDTH - MARGIN_X, y: 80 }, thickness: 0.7, color: BORDER })
  page.drawText(`Versión documental: ${safePdfText(snapshot.document_version)}`, { x: MARGIN_X, y: 61, size: 8, font: regular, color: MUTED })
  page.drawText('Documento emitido por el Sistema de Gestión de Préstamos', {
    x: PAGE_WIDTH - MARGIN_X - regular.widthOfTextAtSize('Documento emitido por el Sistema de Gestión de Préstamos', 8),
    y: 61,
    size: 8,
    font: regular,
    color: MUTED,
  })

  return pdf.save()
}
