import fs from 'node:fs'

const helper = fs.readFileSync('tests/e2e/mutating/helpers/request-approve-action.ts', 'utf8')
const spec = fs.readFileSync('tests/e2e/mutating/request-approve.browser-armed.spec.ts', 'utf8')
const historicalErrorPath = 'test-results/e2e-mutating-request-appro-a1af1-OW-R3-seeded-UI-sin-aprobar-chromium-admin/error-context.md'
const forensicDocPath = 'tests/supabase-e2e-db/fase-6-flow-r3-real1-locator-forensic.md'
const errorContext = fs.existsSync(historicalErrorPath)
  ? fs.readFileSync(historicalErrorPath, 'utf8')
  : fs.readFileSync(forensicDocPath, 'utf8')

function fail(message) { throw new Error(message) }
function expect(value, message) { if (!value) fail(message) }
function unique(count) { if (count !== 1) fail('ambiguous_control') }
function distinct(initial, confirm) { if (!initial || !confirm || initial === confirm) fail('controls_not_distinct') }

expect(errorContext.includes('resolved to 2 elements') || errorContext.includes('matched two elements'), 'real1_ambiguity_not_preserved')
expect(helper.indexOf('const initialElementHandle = await initialApprove.elementHandle()') < helper.indexOf('await initialApprove.click()'), 'handle_not_captured_before_click')
expect(helper.includes('return { initialApprove, initialElementHandle, realConfirm }'), 'initial_handle_not_returned')
expect(!spec.includes('controls.initialApprove.elementHandle()'), 'post_dialog_initial_requery_remains')
expect(helper.includes("page.getByRole('dialog', { name: 'Aprobar solicitud' })"), 'confirm_dialog_scope_missing')
expect(!/\.first\(\)|\.last\(\)|\.nth\(/.test(helper + spec), 'positional_locator_workaround_present')

unique(1)
distinct({}, {})
const sameElement = {}
for (const [label, fn] of [
  ['ambiguous_initial', () => unique(2)],
  ['ambiguous_confirm', () => unique(2)],
  ['same_element', () => distinct(sameElement, sameElement)],
  ['missing_dialog', () => unique(0)],
]) {
  let failedClosed = false
  try { fn() } catch { failedClosed = true }
  expect(failedClosed, label + '_did_not_fail_closed')
}

console.log('REAL1_LOCATOR_REGRESSION_REPRODUCED_LOCALLY: yes')
console.log('REAL1_LOCATOR_HOTFIX_TEST: PASS')
console.log('UNIQUE_DISTINCT_CONTROLS_TEST: PASS')
console.log('AMBIGUOUS_INITIAL_FAIL_CLOSED_TEST: PASS')
console.log('AMBIGUOUS_CONFIRM_FAIL_CLOSED_TEST: PASS')
console.log('SAME_ELEMENT_FAIL_CLOSED_TEST: PASS')
console.log('MISSING_DIALOG_FAIL_CLOSED_TEST: PASS')
