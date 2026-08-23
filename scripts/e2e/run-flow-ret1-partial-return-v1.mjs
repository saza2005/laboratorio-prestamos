import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync, spawn } from 'node:child_process'
import { createAdminReadClient } from './lib/mutating-remote.mjs'

const root = '/home/saza/Proyectos/laboratorio-prestamos-e2e'
const runtimeStem = process.env.E2E_RUNTIME_RET1_STEM || 'ret1-partial-return'
const trackerPath = `.e2e-state/runtime/${runtimeStem}-snapshot.json`
const protocolPath = path.resolve(`.e2e-state/runtime/${runtimeStem}-protocol-audit.jsonl`)
const args = new Set(process.argv.slice(2))
const fail = (code) => { console.error(`L1_FLOW_RET1: FAIL_CLOSED (${code})`); process.exitCode = 1; throw new Error(code) }
const proof = (value, code) => { if (!value) fail(code) }
proof(process.cwd() === root && args.has('--confirm-e2e') && args.has('--flow=RET1') && args.has('--execute-partial-return'), 'precondition')
proof(/^[a-z0-9-]+$/.test(runtimeStem), 'runtime_stem_invalid')
try { process.loadEnvFile('.env.e2e') } catch { fail('env_e2e_load_failed') }
const pre = JSON.parse(await fs.readFile(trackerPath, 'utf8'))
proof(pre.status === 'PRISTINE' && pre.setupAttempt === 0 && pre.cleanupAttempt === 0, 'tracker_not_pristine')
await fs.writeFile(protocolPath, '', { mode: 0o600 })
const audit = (actor, marker) => fs.appendFile(protocolPath, JSON.stringify({ sequence: `${Date.now()}-${process.hrtime.bigint()}`, actor, marker }) + '\n', { mode: 0o600 })
await audit('RUNNER', 'RET1_PROTOCOL_AUDIT_INITIALIZED')
let child
let setupComplete = false
let cleanupComplete = false
try {
  execFileSync(process.execPath, ['--env-file=.env.e2e', 'scripts/e2e/setup-flow-ret1-partial-return-v1.mjs', '--confirm-e2e', '--flow=RET1', '--execute'], { stdio: 'inherit', env: process.env })
  setupComplete = true
  const childEnv = { ...process.env, RESEND_API_KEY: '', E2E_RUNTIME_RET1_PROTOCOL_AUDIT: protocolPath }
  child = spawn('npx', ['playwright', 'test', 'tests/e2e/mutating/partial-return-ret1.actual.spec.ts', '--project=chromium-lab-staff', '--no-deps', '--retries=0', '--workers=1'], { cwd: root, env: childEnv, stdio: 'inherit' })
  const childCode = await new Promise((resolve) => child.once('exit', (code) => resolve(code ?? 1)))
  proof(childCode === 0, 'playwright_failed')
  const current = JSON.parse(await fs.readFile(trackerPath, 'utf8'))
  await fs.writeFile(trackerPath, JSON.stringify({ ...current, status: 'BUSINESS_SUBMISSION_REACHED', businessSubmissionCount: 1 }, null, 2) + '\n', { mode: 0o600 })
  const admin = createAdminReadClient()
  const returns = await admin.from('returns').select('id,loan_id,notes').eq('loan_id', current.fixture.loanId).eq('notes', current.ownership)
  proof(!returns.error && returns.data.length === 1 && returns.data[0].loan_id === current.fixture.loanId, 'remote_return_poststate_invalid')
  const returnId = returns.data[0].id
  const returnItems = await admin.from('return_items').select('id,return_id,loan_item_id,quantity_ok,quantity_damaged,quantity_missing').eq('return_id', returnId)
  const loanItems = await admin.from('loan_items').select('id,loan_id,quantity,returned_quantity,damaged_quantity,missing_quantity').eq('id', current.fixture.loanItemId).eq('loan_id', current.fixture.loanId)
  const loan = await admin.from('loans').select('id,status,user_id,notes').eq('id', current.fixture.loanId).eq('notes', current.ownership)
  const item = await admin.from('items').select('id,stock_available,track_individual').eq('id', current.fixture.itemId)
  const movements = await admin.from('inventory_movements').select('id,item_id,movement_type,quantity,reference_table,reference_id').eq('item_id', current.fixture.itemId)
  proof(!returnItems.error && returnItems.data.length === 1 && returnItems.data[0].loan_item_id === current.fixture.loanItemId && returnItems.data[0].quantity_ok === 1 && returnItems.data[0].quantity_damaged === 0 && returnItems.data[0].quantity_missing === 0, 'remote_return_item_poststate_invalid')
  proof(!loanItems.error && loanItems.data.length === 1 && loanItems.data[0].quantity === 2 && loanItems.data[0].returned_quantity === 1 && loanItems.data[0].damaged_quantity === 0 && loanItems.data[0].missing_quantity === 0, 'remote_loan_item_partial_state_invalid')
  proof(!loan.error && loan.data.length === 1 && loan.data[0].status === 'partial_return' && loan.data[0].user_id === current.borrowerId, 'remote_partial_loan_status_invalid')
  proof(!item.error && item.data.length === 1 && item.data[0].track_individual === false && item.data[0].stock_available === 1, 'remote_return_stock_invalid')
  proof(!movements.error && movements.data.length === 2 && movements.data.some((m) => m.reference_table === 'loans' && m.reference_id === current.fixture.loanId && m.movement_type === 'loan_out' && m.quantity === 2) && movements.data.some((m) => m.reference_table === 'returns' && m.reference_id === returnId && m.movement_type === 'return_ok' && m.quantity === 1), 'remote_return_movements_invalid')
  await fs.writeFile(trackerPath, JSON.stringify({ ...current, status: 'CLEANUP_REQUIRED', businessSubmissionCount: 1, remoteWriteProven: true }, null, 2) + '\n', { mode: 0o600 })
  execFileSync(process.execPath, ['--env-file=.env.e2e', 'scripts/e2e/cleanup-flow-ret1-partial-return-v1.mjs', '--confirm-e2e', '--flow=RET1', '--execute'], { stdio: 'inherit', env: { ...process.env, E2E_MUTATING_CONFIRM: 'RET1-CLEANUP' } })
  cleanupComplete = true
  console.log('L1_FLOW_RET1: PASS')
} catch (error) {
  if (child?.exitCode === null) child.kill('SIGTERM')
  if (setupComplete && !cleanupComplete) {
    try {
      const current = JSON.parse(await fs.readFile(trackerPath, 'utf8'))
      if (current.status !== 'CONSUMED_CLEAN_NO_ACTIVE_FIXTURE' && current.cleanupAttempt === 0) {
        await fs.writeFile(trackerPath, JSON.stringify({ ...current, status: 'CLEANUP_REQUIRED' }, null, 2) + '\n', { mode: 0o600 })
        execFileSync(process.execPath, ['--env-file=.env.e2e', 'scripts/e2e/cleanup-flow-ret1-partial-return-v1.mjs', '--confirm-e2e', '--flow=RET1', '--execute'], { stdio: 'inherit', env: { ...process.env, E2E_MUTATING_CONFIRM: 'RET1-CLEANUP' } })
      }
    } catch { console.error('RET1_CLEANUP: FAIL_CLOSED_RESIDUAL') }
  }
  console.error('L1_FLOW_RET1: FAIL_CLOSED')
  process.exit(1)
}
