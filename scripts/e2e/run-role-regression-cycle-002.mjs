import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createAdminReadClient } from './lib/mutating-remote.mjs'

const root = '/home/saza/Proyectos/laboratorio-prestamos-e2e'
const trackerRelativePath = '.e2e-state/runtime/regression-cycle-002-attempt-9-role-snapshot.json'
const historyRelativePath = '.e2e-state/runtime/regression-cycle-002-attempt-9-role-attempt-history.json'
const protocolRelativePath = '.e2e-state/runtime/regression-cycle-002-attempt-9-role-protocol-audit.jsonl'
const provenanceRelativePath = '.e2e-state/runtime/regression-cycle-002-attempt-9-role-provenance.json'
const trackerPath = path.resolve(trackerRelativePath)
const historyPath = path.resolve(historyRelativePath)
const protocolPath = path.resolve(protocolRelativePath)
const provenancePath = path.resolve(provenanceRelativePath)
const expectedArtifacts = [
  'scripts/e2e/run-role-regression-cycle-002.mjs',
  'tests/e2e/mutating/role-admin-regression-cycle-002.actual.spec.ts',
  'scripts/e2e/lib/mutating-remote.mjs',
  'playwright.config.ts',
  'app/dashboard/usuarios/page.tsx',
  'app/dashboard/usuarios/search.ts',
  'app/dashboard/usuarios/role-form.tsx',
  'app/dashboard/usuarios/actions.ts',
  trackerRelativePath,
  historyRelativePath,
]
const args = new Set(process.argv.slice(2))
const proof = (value, code) => { if (!value) throw new Error(code) }
const readJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'))
const writeJson = async (file, value) => {
  await fs.writeFile(file, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 })
  await fs.chmod(file, 0o600)
}
const audit = (marker) => fs.appendFile(protocolPath, JSON.stringify({ sequence: `${Date.now()}-${process.hrtime.bigint()}`, actor: 'RUNNER', marker }) + '\n', { mode: 0o600 })

async function sha256(file) {
  return createHash('sha256').update(await fs.readFile(file)).digest('hex')
}

async function verifyProvenance() {
  const manifest = await readJson(provenancePath)
  proof(manifest.cycle === 'REGRESSION-CYCLE-002', 'provenance_cycle_mismatch')
  proof(manifest.attempt === 9, 'provenance_attempt_mismatch')
  for (const artifact of expectedArtifacts) {
    const record = manifest.artifacts.find((entry) => entry.path === artifact)
    proof(record && record.sha256 === await sha256(path.resolve(artifact)), 'provenance_mismatch')
  }
}

async function profileRows(admin) {
  const { data, error } = await admin.from('profiles').select('id,role,is_active').order('id')
  proof(!error && Array.isArray(data), 'profile_read_failed')
  return data
}

function exactProfilesMatch(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected)
}

proof(process.cwd() === root, 'wrong_working_directory')
proof(args.has('--confirm-e2e') && args.has('--cycle=REGRESSION-CYCLE-002') && args.has('--attempt=9') && args.has('--execute-targeted-role'), 'execution_not_explicitly_authorized')
try { process.loadEnvFile('.env.e2e') } catch { throw new Error('env_e2e_load_failed') }
proof(process.env.E2E_STUDENT_EMAIL && process.env.E2E_ADMIN_EMAIL, 'target_configuration_missing')

const pristine = await readJson(trackerPath)
const history = await readJson(historyPath)
proof(pristine.status === 'PRISTINE', 'tracker_not_pristine')
proof(pristine.cycle === 'REGRESSION-CYCLE-002' && pristine.attempt === 9, 'tracker_identity_mismatch')
proof(pristine.positiveWriteCount === 0 && pristine.cleanupWriteCount === 0 && pristine.negativeCheckCount === 0, 'tracker_counters_not_zero')
proof(history.cycle === 'REGRESSION-CYCLE-002' && history.attempt === 9, 'history_identity_mismatch')
proof(Array.isArray(history.records) && history.records.length === 0, 'one_attempt_already_consumed')
await verifyProvenance()

const admin = createAdminReadClient()
let attemptStarted = false
let targetId = null
let originalRole = null
let originalActive = null
let baselineProfiles = null

try {
  const targetEmail = process.env.E2E_STUDENT_EMAIL.trim()
  const { data: targets, error: targetError } = await admin.from('profiles').select('id,role,is_active').eq('email', targetEmail)
  proof(!targetError && targets.length === 1, 'target_not_exact')
  const target = targets[0]
  proof(target.role === 'student' && target.is_active === true, 'target_prestate_invalid')

  const { data: adminProfiles, error: adminError } = await admin.from('profiles').select('id,role,is_active').eq('email', process.env.E2E_ADMIN_EMAIL.trim())
  proof(!adminError && adminProfiles.length === 1 && adminProfiles[0].role === 'admin' && adminProfiles[0].is_active === true, 'admin_prestate_invalid')
  proof(adminProfiles[0].id !== target.id, 'target_is_admin')

  targetId = target.id
  originalRole = target.role
  originalActive = target.is_active
  baselineProfiles = await profileRows(admin)
  await fs.writeFile(protocolPath, '', { mode: 0o600 })
  await writeJson(trackerPath, {
    ...pristine,
    status: 'ATTEMPT_STARTED_PRE_BOUNDARY',
    targetId,
    adminId: adminProfiles[0].id,
    originalRole,
    originalActive,
    baselineProfiles,
  })
  attemptStarted = true
  await audit('PRESTATE_VERIFIED')

  const child = spawn('npx', [
    'playwright', 'test',
    'tests/e2e/mutating/role-admin-regression-cycle-002.actual.spec.ts',
    '--project=chromium-admin', '--no-deps', '--retries=0', '--workers=1',
  ], {
    cwd: root,
    env: {
      ...process.env,
      RESEND_API_KEY: '',
      E2E_ROLE_ATTEMPT: '9',
      E2E_ROLE_TRACKER_PATH: trackerRelativePath,
      E2E_ROLE_PROTOCOL_PATH: protocolRelativePath,
    },
    stdio: 'inherit',
  })
  const childCode = await new Promise((resolve) => child.once('exit', (code) => resolve(code ?? 1)))
  proof(childCode === 0, 'targeted_playwright_failed')

  const completed = await readJson(trackerPath)
  proof(completed.status === 'BUSINESS_SEQUENCE_COMPLETE', 'business_sequence_incomplete')
  proof(completed.positiveWriteCount === 3 && completed.cleanupWriteCount === 0 && completed.negativeCheckCount === 9, 'execution_budget_mismatch')
  const postProfiles = await profileRows(admin)
  proof(exactProfilesMatch(postProfiles, baselineProfiles), 'postverify_profiles_changed')
  await writeJson(trackerPath, { ...completed, status: 'CONSUMED_CLEAN', pendingCleanup: false, pendingRecovery: false })
  await writeJson(historyPath, { ...history, records: [{ attempt: 9, result: 'PASS', positiveWriteCount: 3, cleanupWriteCount: 0, negativeCheckCount: 9 }] })
  await audit('POSTVERIFY_PASS')
  console.log('REGRESSION_CYCLE_002_TARGETED_ROLE: PASS')
} catch (error) {
  let clean = false
  let cleanupWriteCount = 0
  if (attemptStarted && targetId && baselineProfiles) {
    try {
      const currentRows = await profileRows(admin)
      const currentTarget = currentRows.find((profile) => profile.id === targetId)
      proof(currentTarget && currentTarget.is_active === originalActive, 'cleanup_target_active_changed')
      const currentTracker = await readJson(trackerPath)
      cleanupWriteCount = currentTracker.cleanupWriteCount ?? 0
      if (currentTarget.role !== originalRole) {
        proof(cleanupWriteCount === 0, 'cleanup_budget_exhausted')
        const { data, error: cleanupError } = await admin.from('profiles').update({ role: originalRole }).eq('id', targetId).eq('role', currentTarget.role).select('id')
        proof(!cleanupError && data.length === 1 && data[0].id === targetId, 'emergency_cleanup_failed')
        cleanupWriteCount = 1
        await audit('EMERGENCY_CLEANUP_WRITE_COMPLETE')
      }
      const postCleanup = await profileRows(admin)
      clean = exactProfilesMatch(postCleanup, baselineProfiles)
      await writeJson(trackerPath, {
        ...currentTracker,
        status: clean ? 'CONSUMED_FAILED_CLEAN' : 'FAILED_RESIDUAL',
        cleanupWriteCount,
        pendingCleanup: !clean,
        pendingRecovery: !clean,
      })
      await writeJson(historyPath, { ...history, records: [{ attempt: 9, result: clean ? 'FAIL_CLEAN' : 'FAIL_RESIDUAL', positiveWriteCount: currentTracker.positiveWriteCount ?? 0, cleanupWriteCount, negativeCheckCount: currentTracker.negativeCheckCount ?? 0 }] })
    } catch {
      const currentTracker = await readJson(trackerPath).catch(() => pristine)
      await writeJson(trackerPath, { ...currentTracker, status: 'FAILED_RESIDUAL', pendingCleanup: true, pendingRecovery: true })
      await writeJson(historyPath, { ...history, records: [{ attempt: 9, result: 'FAIL_RESIDUAL' }] })
    }
  }
  console.error(`REGRESSION_CYCLE_002_TARGETED_ROLE: FAIL_CLOSED (${error instanceof Error ? error.message : 'unknown'})`)
  process.exit(1)
}
