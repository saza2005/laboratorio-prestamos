const args = new Set(process.argv.slice(2))
if (!args.has('--confirm-e2e') || !args.has('--flow=FLOW-L1') || !args.has('--dry-run')) {
  console.error('L1_RUNNER: FAIL\nCATEGORY: dry_run_only')
  process.exit(1)
}

console.log('L1_RUNNER_MODE: DRY_RUN')
console.log('L1_BROWSER_RUNS: 0')
console.log('L1_SUBMIT_CLICKS: 0')
console.log('L1_BUSINESS_RPC_EXECUTIONS: 0')
console.log('REMOTE_WRITES: 0')
