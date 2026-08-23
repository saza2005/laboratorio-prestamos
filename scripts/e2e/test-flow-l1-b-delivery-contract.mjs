import fs from 'node:fs'

const paths = {
  runner: 'scripts/e2e/run-flow-l1-b-delivery.mjs',
  spec: 'tests/e2e/mutating/request-delivery-l1-b.actual.spec.ts',
  cleanup: 'scripts/e2e/cleanup-l1-delivery-fixture.mjs',
  rehearsal: 'tests/e2e/mutating/request-delivery-l1-b.rehearsal.spec.ts',
  historicalRunner: 'scripts/e2e/run-flow-l1-b.mjs',
  historicalCleanup: 'scripts/e2e/cleanup-l1-fixture.mjs',
}
const files = Object.fromEntries(Object.entries(paths).map(([name, file]) => [name, fs.readFileSync(file, 'utf8')]))
const ordered = (source, ...tokens) => { let offset = -1; for (const token of tokens) { const next = source.indexOf(token, offset + 1); if (next < 0) return false; offset = next } return true }
const checks = [
  ['actual spec binding', files.runner.includes('request-delivery-l1-b.actual.spec.ts') && !files.runner.includes('request-delivery-l1-b.rehearsal.spec.ts')],
  ['delivery cleanup binding', files.runner.includes('cleanup-l1-delivery-fixture.mjs')],
  ['historical rehearsal preserved', files.rehearsal.includes("writeSignal('ACTION_ARMED')") && !files.rehearsal.includes("initial.click()")],
  ['prepare stages preserved', ordered(files.runner, 'stage=create', 'stage=created', 'stage=approve', 'stage=fixture-ready')],
  ['pristine delivery tracker', files.runner.includes('deliveryAttempt') && files.runner.includes('deliveryAttempt !== 0')],
  ['one-shot delivery', files.runner.includes('consumeDeliveryAttempt') && files.spec.includes('deliveryServerActionPosts >= 1') && files.spec.includes('final.click()')],
  ['no delivery retry', files.runner.includes('--retries=0') && files.runner.includes('delivery_retry_forbidden') === false && files.spec.includes('automatic') === false],
  ['handshake order', ordered(files.runner, 'BROWSER_READY', 'FIXTURE_READY', 'ACTION_ARMED', 'FINAL_DELIVERY_ARMED', 'EMAIL_PROVIDER_DISABLED_PROVEN', 'DELIVERY_SUBMIT_AUTHORIZED', 'DELIVERY_SUBMIT_ATTEMPTED', 'DELIVERY_RESULT_OBSERVED', 'CLEANUP_REQUIRED', 'COMPLETE')],
  ['historical action armed meaning', files.spec.includes("writeSignal('ACTION_ARMED')") && files.spec.indexOf("writeSignal('ACTION_ARMED')") < files.spec.indexOf("initial.click()")],
  ['email empty child environment', files.runner.includes("RESEND_API_KEY: ''") && files.runner.includes("childEnv.RESEND_API_KEY !== ''")],
  ['no unset email key', !files.runner.includes('delete childEnv.RESEND_API_KEY') && !files.runner.includes('delete process.env.RESEND_API_KEY')],
  ['email safety state', files.runner.includes("writeEvent('EMAIL_PROVIDER_DISABLED_PROVEN')") && ordered(files.runner, 'FINAL_DELIVERY_ARMED', 'EMAIL_PROVIDER_DISABLED_PROVEN', 'DELIVERY_SUBMIT_AUTHORIZED')],
  ['dedicated server contract', files.runner.includes('playwright') && files.runner.includes('--project=chromium-lab-staff')],
  ['pre-delivery classifier', files.cleanup.includes('preDelivery') && files.cleanup.includes('deletePreDelivery')],
  ['full-delivery classifier', files.cleanup.includes('delivered') && files.cleanup.includes('restoreStock')],
  ['unknown fail closed', files.cleanup.includes('unexpected_or_ambiguous_structure') && files.cleanup.includes('process.exit(1)')],
  ['six-step cleanup', ordered(files.cleanup, 'restoreStock', "'inventory_movements'", "'loan_items'", "'loans'", "'request_items'", "'requests'")],
  ['ownership guards', files.cleanup.includes('e2e_fixture_token') && files.cleanup.includes('request_id')],
  ['no broad cleanup', !files.cleanup.includes('truncate') && !files.cleanup.includes('reset')],
  ['production preservation', !files.runner.includes('deliverRequestWithState') && !files.cleanup.includes('deliver_approved_request_with_units')],
  ['secret logging rejected by construction', !files.runner.includes('console.log(process.env') && !files.spec.includes('email')],
]
for (const [name, pass] of checks) if (!pass) throw new Error('l1_b_delivery_contract_failed:' + name)
console.log('L1_B_DELIVERY_CONTRACT_TEST: PASS')
