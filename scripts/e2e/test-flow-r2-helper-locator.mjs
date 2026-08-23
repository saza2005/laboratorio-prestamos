import fs from 'node:fs'

const helperPath = 'tests/e2e/mutating/helpers/request-reject-action.ts'
const source = fs.readFileSync(helperPath, 'utf8')
const corrected = `has: page.locator('textarea[name="rejection_reason"]')`
const defective = `has: detail${'Dialog'}.locator('textarea[name="rejection_reason"]')`

if (!source.includes(corrected)) fail('corrected_locator_missing')
if (source.includes(defective)) fail('defective_locator_present')
if (/\.(first|last|nth)\(/.test(source)) fail('positional_workaround_present')
if (!source.includes(`form.locator('button[type="submit"]')`)) fail('initial_submit_not_scoped')

console.log('FLOW_R2_HELPER_LOCATOR_REGRESSION: PASS')

function fail(code) {
  console.error('FLOW_R2_HELPER_LOCATOR_REGRESSION: FAIL')
  console.error('CATEGORY: ' + code)
  process.exit(1)
}
