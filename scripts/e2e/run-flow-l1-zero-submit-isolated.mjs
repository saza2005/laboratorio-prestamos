#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { parseEnv } from 'node:util'
import {
  fileURLToPath,
  pathToFileURL,
} from 'node:url'

const launcherFile = fileURLToPath(import.meta.url)
const launcherDirectory = path.dirname(launcherFile)
const repo = path.resolve(launcherDirectory, '../..')

const envE2EPath = path.join(repo, '.env.e2e')
const envAppE2EPath = path.join(repo, '.env.app-e2e')
const appGuardPath = path.join(
  repo,
  'scripts/e2e/verify-app-environment.mjs',
)
const coordinatorPath = path.join(
  repo,
  'scripts/e2e/verify-mutating-l1-single-process-preflight.mjs',
)
const runnerPath = path.join(
  repo,
  'scripts/e2e/run-flow-l1-b.mjs',
)

const allowedArgs = new Set([
  '--confirm-e2e',
  '--flow=FLOW-L1',
  '--execute-b',
])

const identityKeys = [
  'E2E_EXPECTED_PROJECT_REF',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NORMAL_SUPABASE_PROJECT_REF',
]

let runnerHandoffAttempted = false

const args = process.argv.slice(2)

for (const arg of args) {
  if (!allowedArgs.has(arg)) {
    failBeforeHandoff('unknown_argument')
  }
}

if (
  !args.includes('--confirm-e2e') ||
  !args.includes('--flow=FLOW-L1') ||
  !args.includes('--execute-b')
) {
  failBeforeHandoff(
    'explicit_zero_submit_authorization_required',
  )
}

if (!hostSecurityPreconditionPasses()) {
  failBeforeHandoff('host_security_envelope_mismatch')
}

let envE2ERaw
let envE2E

try {
  envE2ERaw = fs.readFileSync(envE2EPath, 'utf8')
  envE2E = parseEnv(envE2ERaw)
} catch {
  failBeforeHandoff('env_e2e_parse_failed')
}

if (
  assignmentCount(
    envE2ERaw,
    'E2E_EXPECTED_PROJECT_REF',
  ) !== 1 ||
  assignmentCount(
    envE2ERaw,
    'NEXT_PUBLIC_SUPABASE_URL',
  ) !== 1
) {
  failBeforeHandoff('env_e2e_identity_not_unique')
}

const expectedRef = String(
  envE2E.E2E_EXPECTED_PROJECT_REF ?? '',
).trim()

const e2eProjectUrl = String(
  envE2E.NEXT_PUBLIC_SUPABASE_URL ?? '',
).trim()

if (!expectedRef) {
  failBeforeHandoff('missing_expected_project_ref')
}

if (!e2eProjectUrl) {
  failBeforeHandoff('missing_e2e_project_identity')
}

for (const key of identityKeys) {
  if (
    Object.hasOwn(envE2E, key) &&
    process.env[key] !== undefined &&
    String(process.env[key]) !== String(envE2E[key])
  ) {
    failBeforeHandoff(
      'conflicting_inherited_project_identity',
    )
  }
}

try {
  process.loadEnvFile(envE2EPath)
} catch {
  failBeforeHandoff('env_e2e_load_failed')
}

for (const [key, value] of Object.entries(envE2E)) {
  process.env[key] = value
}

console.log('ENV_E2E_LOADED')

const guardEnv = {}

for (const key of [
  'PATH',
  'HOME',
  'USER',
  'SHELL',
  'TMPDIR',
  'TMP',
  'TEMP',
  'FORCE_COLOR',
  'NO_COLOR',
]) {
  if (process.env[key] !== undefined) {
    guardEnv[key] = process.env[key]
  }
}

guardEnv.E2E_EXPECTED_PROJECT_REF = expectedRef

const appIdentityGuard = spawnSync(
  process.execPath,
  [
    `--env-file=${envAppE2EPath}`,
    appGuardPath,
    '--confirm-e2e',
  ],
  {
    cwd: repo,
    env: guardEnv,
    stdio: 'inherit',
  },
)

if (
  appIdentityGuard.error ||
  appIdentityGuard.signal ||
  appIdentityGuard.status !== 0
) {
  failBeforeHandoff(
    'app_e2e_project_isolation_failed',
  )
}

let runSingleProcessPreflight

try {
  ({
    runSingleProcessPreflight,
  } = await import(pathToFileURL(coordinatorPath).href))
} catch {
  failBeforeHandoff(
    'coordinator_isolation_import_failed',
  )
}

const localPass = async () => ({
  ok: true,
  classification: 'PASS',
})

let isolationOnlyResult

try {
  isolationOnlyResult =
    await runSingleProcessPreflight({
      freezeGate: localPass,
      storageGate: localPass,
      baselineCore: localPass,
      cleanStateCore: localPass,
      l1PreCore: localPass,
    })
} catch {
  failBeforeHandoff(
    'coordinator_project_isolation_failed',
  )
}

if (
  !isolationOnlyResult?.ok ||
  isolationOnlyResult.classification !== 'PASS'
) {
  failBeforeHandoff(
    'coordinator_project_isolation_failed',
  )
}

console.log('PROJECT_ISOLATION_VALIDATED')
console.log('ZERO_SUBMIT_RUNNER_HANDOFF')

runnerHandoffAttempted = true

const runner = spawnSync(
  process.execPath,
  [
    runnerPath,
    '--confirm-e2e',
    '--flow=FLOW-L1',
    '--execute-b',
  ],
  {
    cwd: repo,
    env: process.env,
    stdio: 'inherit',
  },
)

const runnerProcessCreated =
  Number.isInteger(runner.pid) && runner.pid > 0
    ? 'yes'
    : 'UNPROVEN'

console.log(
  'ZERO_SUBMIT_RUNNER_HANDOFF_ATTEMPTED=yes',
)
console.log(
  `ZERO_SUBMIT_RUNNER_PROCESS_CREATED=${runnerProcessCreated}`,
)

if (runner.error) {
  console.log('ZERO_SUBMIT_RUNNER_EXIT_STATUS=NONE')
  console.log('ZERO_SUBMIT_RUNNER_EXIT_SIGNAL=NONE')
  console.error(
    `ZERO_SUBMIT_RUNNER_LAUNCH_ERROR_CODE=${
      safeErrorCode(runner.error.code)
    }`,
  )
  process.exit(1)
}

if (runner.signal) {
  console.log('ZERO_SUBMIT_RUNNER_EXIT_STATUS=NONE')
  console.log(
    `ZERO_SUBMIT_RUNNER_EXIT_SIGNAL=${
      safeSignal(runner.signal)
    }`,
  )
  process.exit(1)
}

if (!Number.isInteger(runner.status)) {
  console.log('ZERO_SUBMIT_RUNNER_EXIT_STATUS=NONE')
  console.log('ZERO_SUBMIT_RUNNER_EXIT_SIGNAL=NONE')
  process.exit(1)
}

console.log(
  `ZERO_SUBMIT_RUNNER_EXIT_STATUS=${runner.status}`,
)
console.log('ZERO_SUBMIT_RUNNER_EXIT_SIGNAL=NONE')

process.exit(runner.status)

function hostSecurityPreconditionPasses() {
  try {
    const status = readStatus('/proc/self/status')
    const appArmor = fs
      .readFileSync(
        '/proc/self/attr/current',
        'utf8',
      )
      .trim()
    const ancestry = inspectAncestry()

    const pass =
      status.Seccomp === '0' &&
      status.Seccomp_filters === '0' &&
      status.NoNewPrivs === '0' &&
      appArmor === 'unconfined' &&
      !ancestry.bwrapFound &&
      ancestry.complete

    console.log(
      `HOST_SECURITY_ENVELOPE_PRECONDITION=${
        pass ? 'PASS' : 'FAIL'
      }`,
    )

    return pass
  } catch {
    console.log(
      'HOST_SECURITY_ENVELOPE_PRECONDITION=FAIL',
    )
    return false
  }
}

function readStatus(file) {
  const values = {}

  for (
    const line of fs
      .readFileSync(file, 'utf8')
      .split('\n')
  ) {
    const separator = line.indexOf(':')

    if (separator !== -1) {
      values[line.slice(0, separator)] =
        line.slice(separator + 1).trim()
    }
  }

  return values
}

function inspectAncestry() {
  let pid = process.pid
  let complete = false
  let bwrapFound = false
  const visited = new Set()

  while (pid > 0 && !visited.has(pid)) {
    visited.add(pid)

    const status = readStatus(
      `/proc/${pid}/status`,
    )
    const comm = status.Name ?? ''
    const argv = fs
      .readFileSync(`/proc/${pid}/cmdline`)
      .toString('utf8')
      .split('\0')
      .filter(Boolean)

    if (
      comm === 'bwrap' ||
      argv.some(
        argument =>
          path.basename(argument) === 'bwrap',
      )
    ) {
      bwrapFound = true
    }

    const ppid = Number(status.PPid)

    if (!Number.isInteger(ppid) || ppid < 0) {
      return {
        bwrapFound,
        complete: false,
      }
    }

    if (ppid === 0) {
      complete = true
      break
    }

    pid = ppid
  }

  return {
    bwrapFound,
    complete,
  }
}

function assignmentCount(raw, key) {
  const escaped = key.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  )
  const pattern = new RegExp(
    `^\\s*(?:export\\s+)?${escaped}\\s*=`,
  )

  return raw
    .split(/\r?\n/)
    .filter(line => pattern.test(line))
    .length
}

function safeErrorCode(value) {
  const code = String(value ?? 'UNAVAILABLE')

  return /^[A-Z0-9_]+$/.test(code)
    ? code
    : 'UNAVAILABLE'
}

function safeSignal(value) {
  const signal = String(value ?? 'UNAVAILABLE')

  return /^SIG[A-Z0-9]+$/.test(signal)
    ? signal
    : 'UNAVAILABLE'
}

function failBeforeHandoff(code) {
  if (runnerHandoffAttempted) {
    console.error(
      'ZERO_SUBMIT_ISOLATED_LAUNCHER: POST_HANDOFF_FAILURE',
    )
    process.exit(1)
  }

  console.error(
    `ZERO_SUBMIT_ISOLATED_LAUNCHER: FAIL (${code})`,
  )
  console.error(
    'ZERO_SUBMIT_RUNNER_HANDOFF_ATTEMPTED=no',
  )
  console.error('ZERO_SUBMIT_RUNNER_EXECUTIONS=0')
  console.error('FIXTURE_CREATE_ATTEMPTS=0')
  console.error('APPROVAL_ATTEMPTS=0')
  console.error('CLEANUP_ATTEMPTS=0')
  console.error('REMOTE_WRITES=0')
  process.exit(1)
}
