export const LOAN_TERMS_VERSION = '2026-09-22-v1'

export const LOAN_TERMS_TITLE =
  'TÉRMINOS Y CONDICIONES DEL PRÉSTAMO DE EQUIPOS'

export const LOAN_TERMS_INTRO =
  'El solicitante declara que recibe los equipos detallados en la solicitud bajo su responsabilidad y se compromete a:'

export const LOAN_TERMS_ITEMS = [
  'Utilizar los equipos únicamente para actividades académicas, investigativas o institucionales autorizadas.',
  'Garantizar el cuidado e integridad física de los bienes entregados.',
  'No manipular, modificar o trasladar los equipos sin autorización del personal responsable del laboratorio.',
  'Informar oportunamente cualquier daño, pérdida o inconveniente presentado durante el período del préstamo.',
  'Devolver los equipos completos y en las mismas condiciones en las que fueron entregados, considerando su correcto funcionamiento.',
  'Responder por daños ocasionados debido a un uso inadecuado, negligencia o incumplimiento de las condiciones establecidas.',
] as const

export const LOAN_TERMS_CLOSING =
  'La aceptación de estos términos representa la conformidad del solicitante con las responsabilidades asociadas al préstamo de bienes institucionales.'

export const LOAN_TERMS_FIELD = 'terms_accepted'
export const LOAN_TERMS_ACCEPTED_VALUE = 'accepted'

export function isLoanTermsAccepted(
  value: FormDataEntryValue | null
): boolean {
  return value === LOAN_TERMS_ACCEPTED_VALUE
}
