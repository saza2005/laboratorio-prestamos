import fs from 'node:fs'

const source = fs.readFileSync('scripts/e2e/seed-mutating-r3.mjs', 'utf8')
const required = [
  "'--flow=FLOW-R3'",
  "E2E_MUTATING_CONFIRM !== 'FLOW-R3-SEED'",
  "create_request_transaction",
  "p_groups: []",
  "p_items: [{ item_id: bulkId, quantity_requested: 1 }]",
  "item.data.status !== 'active'",
  'Number(item.data.stock_available) < 1',
  'registerCreatedEntity(\'FLOW-R3\', \'request\'',
]
for (const value of required) if (!source.includes(value)) throw new Error('seed_contract_missing_' + value)
if (source.includes('retry') || source.includes('seed_write_confirmed')) throw new Error('seed_fail_closed_contract_violation')
console.log('R3_SEED_CONTRACT_TEST: PASS')
