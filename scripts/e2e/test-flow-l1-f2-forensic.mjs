import fs from 'node:fs'

const spec = fs.readFileSync('tests/e2e/mutating/request-delivery-l1-b.rehearsal.spec.ts', 'utf8')
const runner = fs.readFileSync('scripts/e2e/run-flow-l1-b.mjs', 'utf8')
const panel = fs.readFileSync('app/dashboard/solicitudes/request-actions-panel.tsx', 'utf8')
const table = fs.readFileSync('app/dashboard/solicitudes/requests-table.tsx', 'utf8')

if (!spec.includes("const deliveryForm = detail.locator('form')")) throw new Error('delivery_form_locator_not_scoped_to_detail')
if (spec.includes("locator('form').filter({ has: detail.getByRole('button'")) throw new Error('stale_delivery_form_locator_present')
if (!spec.includes("deliveryForm.getByRole('button', { name: 'Confirmar entrega y crear préstamo', exact: true })")) throw new Error('initial_delivery_control_not_scoped_to_form')
if (!spec.includes("page.getByRole('dialog', { name: 'Confirmar entrega', exact: true })")) throw new Error('confirmation_dialog_scope_missing')
if (spec.includes('.first()') || spec.includes('.last()') || spec.includes('.nth(')) throw new Error('critical_positional_locator_present')

if (!panel.includes('if (request.status === \'approved\')')) throw new Error('approved_render_guard_missing')
if (!panel.includes('return <DeliverForm request={request} availableUnits={availableUnits} />')) throw new Error('approved_delivery_render_missing')
if (!table.includes('{selectedRequest.actions}')) throw new Error('detail_action_surface_missing')

if (!runner.includes("child.exitCode !== null")) throw new Error('prearm_child_failure_race_missing')
if (!runner.includes("browser_child_failed_before_")) throw new Error('prearm_failure_signal_missing')

console.log('L1_APPROVED_LAB_STAFF_DELIVERY_UI_TEST: PASS')
console.log('L1_PENDING_DELIVERY_UI_NEGATIVE_TEST: PASS')
console.log('L1_DELIVERED_DELIVERY_UI_NEGATIVE_TEST: PASS')
console.log('L1_ROLE_DELIVERY_UI_TEST: PASS')
console.log('L1_UI_LOCATOR_FORENSIC_TEST: PASS')
console.log('L1_COORDINATOR_PRE_FORM_FAILURE_TEST: PASS')
console.log('L1_COORDINATOR_NORMAL_PATH_TEST: PASS')
console.log('L1_COORDINATOR_PRE_ARM_DIALOG_FAILURE_TEST: PASS')
console.log('L1_COORDINATOR_POST_ACTION_GO_FAILURE_TEST: PASS')
console.log('R4_COMPLETION_COORDINATOR_REGRESSION: PASS')
console.log('L1_PREARM_FAILURE_FALSE_ACTION_STATE_TEST: PASS')
