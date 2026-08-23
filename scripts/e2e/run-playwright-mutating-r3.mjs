const args = new Set(process.argv.slice(2))
if (!args.has('--confirm-e2e') || !args.has('--flow=FLOW-R3')) fail('missing_arguments')
if (args.has('--execute')) fail('real_execution_not_authorized_in_preparation')
const readonlyBrowserReady = args.has('--browser-ready-readonly')
if ([...args].some((arg) => !['--confirm-e2e', '--flow=FLOW-R3', '--list', '--dry-run', '--browser-ready-readonly'].includes(arg))) fail('unknown_argument')
if (readonlyBrowserReady) {
  const { execFileSync } = await import('node:child_process')
  execFileSync(process.execPath, ['scripts/e2e/run-flow-r3-seeded-ui-rehearsal.mjs', '--confirm-e2e', '--browser-ready-readonly'], {
    stdio: 'inherit',
    env: process.env,
  })
  process.exit(0)
}
console.log('FLOW_R3_RUNNER_MODE: DRY_RUN')
console.log('BUSINESS_FLOW: FLOW-R3')
console.log('TESTS_SELECTED: 1')
console.log('AUTH_DEPENDENCIES: 0')
console.log('SECOND_BROWSER_LAUNCHES: 0')
console.log('REMOTE_WRITES: 0')
function fail(code) { console.error('FLOW_R3_RUNNER: FAIL\nCATEGORY: ' + code); process.exit(1) }
