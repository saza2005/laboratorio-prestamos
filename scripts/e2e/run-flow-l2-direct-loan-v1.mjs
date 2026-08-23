import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync, spawn } from 'node:child_process'
import { createAdminReadClient } from './lib/mutating-remote.mjs'

const root = '/home/saza/Proyectos/laboratorio-prestamos-e2e'
const trackerPath = '.e2e-state/runtime/l2-direct-loan-snapshot.json'
const protocolPath = path.resolve('.e2e-state/runtime/l2-direct-loan-protocol-audit.jsonl')
const args = new Set(process.argv.slice(2))
const fail = (code) => { console.error(`L1_FLOW_L2: FAIL_CLOSED (${code})`); process.exitCode = 1; throw new Error(code) }
const proof = (value, code) => { if (!value) fail(code) }
proof(process.cwd() === root && args.has('--confirm-e2e') && args.has('--flow=FLOW-L2') && args.has('--execute-direct-loan'), 'precondition')
try { process.loadEnvFile('.env.e2e') } catch { fail('env_e2e_load_failed') }
const pre = JSON.parse(await fs.readFile(trackerPath, 'utf8'))
proof(pre.status === 'PRISTINE' && pre.setupAttempt === 0, 'tracker_not_pristine')
await fs.writeFile(protocolPath, '', { mode: 0o600 })
const audit = (actor, marker) => fs.appendFile(protocolPath, JSON.stringify({ sequence: `${Date.now()}-${process.hrtime.bigint()}`, actor, marker }) + '\n', { mode: 0o600 })
await audit('RUNNER', 'L2_PROTOCOL_AUDIT_INITIALIZED')
let child
let setupComplete = false
let cleanupComplete = false
try {
  execFileSync(process.execPath, ['--env-file=.env.e2e', 'scripts/e2e/setup-flow-l2-direct-loan-v1.mjs', '--confirm-e2e', '--flow=FLOW-L2', '--execute'], { stdio: 'inherit', env: process.env })
  setupComplete = true
  const childEnv = { ...process.env, RESEND_API_KEY: '', E2E_RUNTIME_L2_PROTOCOL_AUDIT: protocolPath }
  child = spawn('npx', ['playwright', 'test', 'tests/e2e/mutating/direct-loan-l2.actual.spec.ts', '--project=chromium-lab-staff', '--no-deps', '--retries=0', '--workers=1'], { cwd: root, env: childEnv, stdio: 'inherit' })
  const childCode = await new Promise(resolve => child.once('exit', code => resolve(code ?? 1)))
  proof(childCode === 0, 'playwright_failed')
  const current = JSON.parse(await fs.readFile(trackerPath, 'utf8'))
  await fs.writeFile(trackerPath, JSON.stringify({ ...current, status: 'BUSINESS_SUBMISSION_REACHED', businessSubmissionCount: 1 }, null, 2) + '\n', { mode: 0o600 })
  const admin = createAdminReadClient()
  const loans = await admin.from('loans').select('id,user_id,status,notes').eq('notes', current.ownership)
  proof(!loans.error && loans.data?.length === 1 && loans.data[0].user_id === current.borrowerId && loans.data[0].status === 'active', 'remote_loan_poststate_invalid')
  const loanItems = await admin.from('loan_items').select('id,item_id,quantity,item_unit_id').eq('loan_id', loans.data[0].id)
  const movements = await admin.from('inventory_movements').select('id,item_id,movement_type,quantity,reference_id').eq('reference_id', loans.data[0].id).eq('reference_table', 'loans')
  const item = await admin.from('items').select('id,stock_available,track_individual').eq('id', current.fixture.itemId).maybeSingle()
  proof(!loanItems.error && loanItems.data?.length === 1 && loanItems.data[0].item_id === current.fixture.itemId && loanItems.data[0].quantity === 1 && loanItems.data[0].item_unit_id === null, 'remote_loan_item_poststate_invalid')
  proof(!movements.error && movements.data?.length === 1 && movements.data[0].item_id === current.fixture.itemId && movements.data[0].movement_type === 'loan_out' && movements.data[0].quantity === 1, 'remote_movement_poststate_invalid')
  proof(!item.error && item.data?.track_individual === false && item.data.stock_available === current.baseline.stockAvailable - 1, 'remote_item_poststate_invalid')
  await fs.writeFile(trackerPath, JSON.stringify({ ...current, status: 'CLEANUP_REQUIRED', businessSubmissionCount: 1, remoteWriteProven: true }, null, 2) + '\n', { mode: 0o600 })
  execFileSync(process.execPath, ['--env-file=.env.e2e', 'scripts/e2e/cleanup-flow-l2-direct-loan-v1.mjs', '--confirm-e2e', '--flow=FLOW-L2', '--execute'], { stdio: 'inherit', env: { ...process.env, E2E_MUTATING_CONFIRM: 'FLOW-L2-CLEANUP' } })
  cleanupComplete = true
  console.log('L1_FLOW_L2: PASS')
} catch (error) {
  if (child?.exitCode === null) child.kill('SIGTERM')
  if (setupComplete && !cleanupComplete) {
    try {
      const current = JSON.parse(await fs.readFile(trackerPath, 'utf8'))
      if (current.status !== 'CONSUMED_CLEAN_NO_ACTIVE_FIXTURE' && current.cleanupAttempt === 0) {
        await fs.writeFile(trackerPath, JSON.stringify({ ...current, status: 'CLEANUP_REQUIRED' }, null, 2) + '\n', { mode: 0o600 })
        execFileSync(process.execPath, ['--env-file=.env.e2e', 'scripts/e2e/cleanup-flow-l2-direct-loan-v1.mjs', '--confirm-e2e', '--flow=FLOW-L2', '--execute'], { stdio: 'inherit', env: { ...process.env, E2E_MUTATING_CONFIRM: 'FLOW-L2-CLEANUP' } })
      }
    } catch { console.error('L2_CLEANUP: FAIL_CLOSED_RESIDUAL') }
  }
  console.error('L1_FLOW_L2: FAIL_CLOSED')
  process.exit(1)
}
