import { expect, test } from '@playwright/test'
import { materialsDeliveredTemplate } from '../../lib/email/templates/materials-delivered'
import { requestApprovedTemplate } from '../../lib/email/templates/request-approved'
import { requestCreatedTemplate } from '../../lib/email/templates/request-created'
import { requestRejectedTemplate } from '../../lib/email/templates/request-rejected'
import { returnRegisteredTemplate } from '../../lib/email/templates/return-registered'

const malicious = '<script>alert("correo")</script>'
const safeUrl = 'https://app.example.edu/solicitudes'

test.describe('Seguridad HTML de correos transaccionales', () => {
  test('escapa datos dinámicos en solicitudes creadas y aprobadas', () => {
    const commonInput = {
      requesterName: malicious,
      requestId: malicious,
      purpose: malicious,
      scheduledReturnDate: null,
      materials: [{ code: malicious, name: malicious, quantity: 1 }],
      requestUrl: safeUrl,
    }

    assertEscaped(requestCreatedTemplate(commonInput).html)
    assertEscaped(requestApprovedTemplate(commonInput).html)
  })

  test('escapa el motivo de rechazo y datos de la solicitud', () => {
    const template = requestRejectedTemplate({
      requesterName: malicious,
      requestId: malicious,
      purpose: malicious,
      scheduledReturnDate: null,
      rejectionReason: malicious,
      requestUrl: safeUrl,
    })

    assertEscaped(template.html)
  })

  test('escapa prestatario y materiales entregados', () => {
    const template = materialsDeliveredTemplate({
      borrowerName: malicious,
      loanId: malicious,
      expectedReturnDate: null,
      materials: [{ code: malicious, name: malicious, quantity: 2 }],
      isPartialDelivery: false,
      requestUrl: safeUrl,
    })

    assertEscaped(template.html)
  })

  test('escapa observaciones y materiales de una devolución', () => {
    const template = returnRegisteredTemplate({
      borrowerName: malicious,
      returnId: malicious,
      receivedAt: null,
      expectedReturnDate: null,
      materials: [
        {
          code: malicious,
          name: malicious,
          quantityOk: 1,
          quantityDamaged: 0,
          quantityMissing: 0,
        },
      ],
      hasIssues: false,
      isPartialReturn: false,
      notes: malicious,
      requestUrl: safeUrl,
    })

    assertEscaped(template.html)
  })
})

function assertEscaped(html: string) {
  expect(html).not.toContain('<script>')
  expect(html).not.toContain('</script>')
  expect(html).toContain('&lt;script&gt;')
  expect(html).toContain('&quot;correo&quot;')
}
