import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync, spawn } from 'node:child_process'
import { createAdminReadClient } from './lib/mutating-remote.mjs'

const root = '/home/saza/Proyectos/laboratorio-prestamos-e2e'
const trackerPath = '.e2e-state/runtime/ret2-full-return-snapshot.json'
const historyPath = '.e2e-state/runtime/ret2-full-return-attempt-history.json'
const manifestPath = '.e2e-state/runtime/ret2-full-return-attempt-2-manifest.json'
const protocolPath = path.resolve('.e2e-state/runtime/ret2-full-return-protocol-audit.jsonl')
const setupPath = 'scripts/e2e/setup-flow-ret2-full-return-v2.mjs'
const testPath = 'tests/e2e/mutating/full-return-ret2-v2.actual.spec.ts'
const cleanupPath = 'scripts/e2e/cleanup-flow-ret2-full-return-v2.mjs'
const runnerPath = 'scripts/e2e/run-flow-ret2-full-return-v2.mjs'
const args = new Set(process.argv.slice(2))
let setupComplete = false
let cleanupComplete = false
let child
let failurePrinted = false
const failure = (stage, assertion) => { console.error(`L1_FLOW_RET2_FAILURE_STAGE=${stage}`); console.error(`L1_FLOW_RET2_FAILURE_ASSERTION=${assertion}`); console.error('L1_FLOW_RET2: FAIL_CLOSED'); failurePrinted = true; throw new Error(`${stage}:${assertion}`) }
const proof = (value, stage, assertion) => { if (!value) failure(stage, assertion) }
const sha256File = async (file) => crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex')
const read = async (admin, table, columns, build, stage, assertion) => { const result = await build(admin.from(table).select(columns)); proof(!result.error, stage, assertion); return result.data ?? [] }

proof(process.cwd() === root && args.has('--confirm-e2e') && args.has('--flow=RET2') && args.has('--execute-full-return'), 'PRECONDITION', 'AUTHORIZATION_ATTEMPT_2')
try { process.loadEnvFile('.env.e2e') } catch { failure('PRECONDITION', 'ENV_E2E') }
const expectedRef = String(process.env.E2E_EXPECTED_PROJECT_REF ?? '').trim()
const publicUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
proof(expectedRef && publicUrl === `https://${expectedRef}.supabase.co`, 'PRECONDITION', 'E2E_PROJECT')
const pre = JSON.parse(await fs.readFile(trackerPath, 'utf8'))
const priorHistory = JSON.parse(await fs.readFile(historyPath, 'utf8'))
proof(pre.status === 'CONSUMED_CLEAN_NO_ACTIVE_FIXTURE' && pre.setupAttempt === 1 && pre.cleanupAttempt === 1 && pre.remoteWriteProven === true, 'PRECONDITION', 'PRIOR_ATTEMPT_CLEAN')
proof(Array.isArray(priorHistory.records) && priorHistory.records.length === 1, 'PRECONDITION', 'HISTORY_ATTEMPT_1_PRESERVED')
try { await fs.access(manifestPath); failure('MANIFEST', 'ALREADY_EXISTS') } catch (error) { if (error?.code !== 'ENOENT') failure('MANIFEST', 'ACCESS') }
const manifest = { runner_version: 'ret2-full-return-v2', flow: 'RET2', attempt_ordinal: 2, setup_sha256: await sha256File(setupPath), test_sha256: await sha256File(testPath), cleanup_sha256: await sha256File(cleanupPath), runner_sha256: await sha256File(runnerPath), timestamp_local: new Date().toISOString() }
try { await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx', mode: 0o600 }) } catch { failure('MANIFEST', 'WRITE_ONCE') }
try {
  execFileSync(process.execPath, ['--env-file=.env.e2e', setupPath, '--confirm-e2e', '--flow=RET2', '--execute'], { cwd: root, stdio: 'inherit', env: process.env })
  setupComplete = true
  await fs.appendFile(protocolPath, JSON.stringify({ sequence: `runner-2-${Date.now()}`, attemptOrdinal: 2, actor: 'RUNNER_RET2_ATTEMPT2', marker: 'RET2_ATTEMPT2_AUDIT_INITIALIZED' }) + '\n', { mode: 0o600 })
  child = spawn('npx', ['playwright', 'test', testPath, '--project=chromium-lab-staff', '--no-deps', '--retries=0', '--workers=1'], { cwd: root, env: { ...process.env, RESEND_API_KEY: '', E2E_RUNTIME_RET2_PROTOCOL_AUDIT: protocolPath }, stdio: 'inherit' })
  const childCode = await new Promise((resolve) => child.once('exit', (code) => resolve(code ?? 1)))
  proof(childCode === 0, 'PLAYWRIGHT', 'CHILD_PASS')
  const current = JSON.parse(await fs.readFile(trackerPath, 'utf8'))
  await fs.writeFile(trackerPath, JSON.stringify({ ...current, status: 'BUSINESS_SUBMISSION_REACHED', businessSubmissionCount: 1 }, null, 2) + '\n', { mode: 0o600 })
  const admin = createAdminReadClient()
  const loans = await read(admin, 'loans', 'id,user_id,status,notes', q => q.eq('id', current.fixture.loanId).eq('notes', current.ownership), 'REMOTE_POSTSTATE_VERIFY', 'LOAN_ROW_EXACT')
  proof(loans.length === 1 && loans[0].user_id === current.borrowerId && loans[0].status === 'returned', 'REMOTE_POSTSTATE_VERIFY', 'LOAN_RETURNED_EXACT')
  const loanItems = await read(admin, 'loan_items', 'id,loan_id,quantity,returned_quantity,damaged_quantity,missing_quantity,item_unit_id', q => q.eq('id', current.fixture.loanItemId).eq('loan_id', current.fixture.loanId), 'REMOTE_POSTSTATE_VERIFY', 'LOAN_ITEM_EXACT')
  proof(loanItems.length === 1 && loanItems[0].quantity === 1 && loanItems[0].returned_quantity === 1 && loanItems[0].damaged_quantity === 0 && loanItems[0].missing_quantity === 0 && loanItems[0].item_unit_id === null, 'REMOTE_POSTSTATE_VERIFY', 'LOAN_ITEM_RETURNED_EXACT')
  const returns = await read(admin, 'returns', 'id,loan_id,notes', q => q.eq('loan_id', current.fixture.loanId), 'REMOTE_POSTSTATE_VERIFY', 'RETURN_ROW_EXACT')
  proof(returns.length === 1, 'REMOTE_POSTSTATE_VERIFY', 'RETURN_ROW_EXACT')
  const returnItems = await read(admin, 'return_items', 'id,return_id,loan_item_id,quantity_ok,quantity_damaged,quantity_missing', q => q.eq('return_id', returns[0].id), 'REMOTE_POSTSTATE_VERIFY', 'RETURN_ITEM_EXACT')
  proof(returnItems.length === 1 && returnItems[0].loan_item_id === current.fixture.loanItemId && returnItems[0].quantity_ok === 1 && returnItems[0].quantity_damaged === 0 && returnItems[0].quantity_missing === 0, 'REMOTE_POSTSTATE_VERIFY', 'RETURN_ITEM_EXACT')
  const items = await read(admin, 'items', 'id,track_individual,stock_available', q => q.eq('id', current.fixture.itemId).eq('code', current.fixture.itemCode), 'REMOTE_POSTSTATE_VERIFY', 'ITEM_STOCK_EXACT')
  proof(items.length === 1 && items[0].track_individual === false && items[0].stock_available === 1, 'REMOTE_POSTSTATE_VERIFY', 'ITEM_STOCK_RESTORED')
  const movements = await read(admin, 'inventory_movements', 'id,item_id,movement_type,quantity,reference_table,reference_id', q => q.eq('item_id', current.fixture.itemId), 'REMOTE_POSTSTATE_VERIFY', 'MOVEMENTS_EXACT')
  proof(movements.length === 2 && movements.some((m) => m.reference_table === 'loans' && m.reference_id === current.fixture.loanId && m.movement_type === 'loan_out' && m.quantity === 1) && movements.some((m) => m.reference_table === 'returns' && m.reference_id === returns[0].id && m.movement_type === 'return_ok' && m.quantity === 1), 'REMOTE_POSTSTATE_VERIFY', 'MOVEMENTS_EXACT')
  await fs.writeFile(trackerPath, JSON.stringify({ ...current, status: 'CLEANUP_REQUIRED', businessSubmissionCount: 1, remoteWriteProven: true }, null, 2) + '\n', { mode: 0o600 })
  execFileSync(process.execPath, ['--env-file=.env.e2e', cleanupPath, '--confirm-e2e', '--flow=RET2', '--execute'], { cwd: root, stdio: 'inherit', env: { ...process.env, E2E_MUTATING_CONFIRM: 'RET2-CLEANUP-V2' } })
  cleanupComplete = true
  const terminal = JSON.parse(await fs.readFile(trackerPath, 'utf8'))
  const finalHistory = JSON.parse(await fs.readFile(historyPath, 'utf8'))
  proof(terminal.status === 'CONSUMED_CLEAN_NO_ACTIVE_FIXTURE' && finalHistory.records.length === priorHistory.records.length + 1, 'TERMINAL_STATE', 'CONSUMED_CLEAN_HISTORY_ATTEMPT_2')
  console.log('L1_FLOW_RET2_V2: PASS ATTEMPT=2')
} catch (error) {
  if (child && !child.killed) child.kill('SIGTERM')
  if (setupComplete && !cleanupComplete) {
    try {
      const state = JSON.parse(await fs.readFile(trackerPath, 'utf8'))
      if (state.status !== 'CONSUMED_CLEAN_NO_ACTIVE_FIXTURE' && state.cleanupAttempt === 0) {
        await fs.writeFile(trackerPath, JSON.stringify({ ...state, status: 'CLEANUP_REQUIRED' }, null, 2) + '\n', { mode: 0o600 })
        execFileSync(process.execPath, ['--env-file=.env.e2e', cleanupPath, '--confirm-e2e', '--flow=RET2', '--execute'], { cwd: root, stdio: 'inherit', env: { ...process.env, E2E_MUTATING_CONFIRM: 'RET2-CLEANUP-V2' } })
      }
    } catch { console.error('L1_FLOW_RET2_FAILURE_STAGE=CLEANUP'); console.error('L1_FLOW_RET2_FAILURE_ASSERTION=FAIL_CLOSED_RESIDUAL') }
  }
  if (!failurePrinted) { console.error('L1_FLOW_RET2_FAILURE_STAGE=UNEXPECTED'); console.error('L1_FLOW_RET2_FAILURE_ASSERTION=STATIC_REASON_UNAVAILABLE'); console.error('L1_FLOW_RET2: FAIL_CLOSED') }
  process.exit(1)
}
