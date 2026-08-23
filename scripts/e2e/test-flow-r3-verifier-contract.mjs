import fs from 'node:fs'

const source = fs.readFileSync('scripts/e2e/verify-mutating-flow-r3.mjs', 'utf8')
for (const value of ['pending', 'approved', 'quantity_approved', 'approved_by', 'approved_at', 'inventory_movements', 'FLOW_R3_SEEDED', 'FLOW_R3_DELTA', 'FLOW_R3_POST_CLEANUP']) {
  if (!source.includes(value)) throw new Error('verifier_contract_missing_' + value)
}
console.log('R3_VERIFIER_CONTRACT_TEST: PASS')
