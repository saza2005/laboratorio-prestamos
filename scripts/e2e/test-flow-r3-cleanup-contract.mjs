import fs from 'node:fs'

const source = fs.readFileSync('scripts/e2e/cleanup-mutating-r3.mjs', 'utf8')
for (const value of ["eq('id', children.data[0].id)", "eq('id', flow.request_id)", "request_items", "requests", "E2E_MUT_REQ_R3_"]) {
  if (!source.includes(value)) throw new Error('cleanup_contract_missing_' + value)
}
if (source.includes('.delete()') && source.includes(".like('purpose'")) throw new Error('cleanup_broad_delete_contract_violation')
console.log('R3_CLEANUP_EXACTNESS_TEST: PASS')
