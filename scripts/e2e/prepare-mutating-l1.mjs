const args = new Set(process.argv.slice(2))
if (!args.has('--confirm-e2e') || !args.has('--flow=FLOW-L1') || !args.has('--dry-run')) {
  console.error('L1_FIXTURE_PREPARATION: FAIL\nCATEGORY: dry_run_only')
  process.exit(1)
}

console.log('L1_FIXTURE_PREPARATION_MODE: DRY_RUN')
console.log('L1_FIXTURE_REQUEST_CREATE_RPC_WOULD_EXECUTE: 1')
console.log('L1_FIXTURE_APPROVE_RPC_WOULD_EXECUTE: 1')
console.log('L1_FIXTURE_PRE_BUSINESS_STATUS: approved')
console.log('L1_FIXTURE_REAL_EXECUTED: no')
console.log('BUSINESS_RPC_EXECUTIONS: 0')
console.log('REMOTE_WRITES: 0')
