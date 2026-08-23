#!/usr/bin/env node
const args = new Set(process.argv.slice(2))
if (!args.has('--confirm-e2e') || !args.has('--flow=FLOW-L1') || !args.has('--dry-run')) {
  console.error('L1_CLEANUP: FAIL\nCATEGORY: dry_run_only')
  process.exit(1)
}

console.log('L1_CLEANUP_MODE: DRY_RUN')
console.log('L1_CLEANUP_EXACT_ID_ONLY: yes')
console.log('L1_CLEANUP_RESTORATION_ORDER: inventory_movements -> loan_group_items -> loan_groups -> loan_items -> loans -> request_items -> requests')
console.log('L1_CLEANUP_REAL_EXECUTED: no')
console.log('REMOTE_WRITES: 0')
