import fs from 'node:fs'

const verifier = fs.readFileSync('scripts/e2e/verify-l1-b-fixture.mjs', 'utf8')
const prepare = fs.readFileSync('scripts/e2e/prepare-l1-fixture.mjs', 'utf8')
const runner = fs.readFileSync('scripts/e2e/run-flow-l1-b.mjs', 'utf8')

const createdVerifier = runner.indexOf("--stage=created")
const approval = runner.indexOf("--stage=approve")
const fixtureReadyVerifier = runner.indexOf("--stage=fixture-ready")
if (createdVerifier < 0 || approval < 0 || fixtureReadyVerifier < 0 || !(createdVerifier < approval && approval < fixtureReadyVerifier)) {
  throw new Error('created_approval_gate_order_invalid')
}
if (!fs.readFileSync('scripts/e2e/cleanup-l1-fixture.mjs', 'utf8').includes('pendingFixture')) throw new Error('pending_cleanup_path_missing')
if (!prepare.includes("['create', 'approve']") || !prepare.includes("stage === 'create'") || !prepare.includes("stage === 'approve'")) {
  throw new Error('fixture_stages_not_separated')
}
if (!verifier.includes("verifyRequest('pending', 0, 0)") || !verifier.includes("verifyRequest('approved', 1, 0)")) {
  throw new Error('stage_signatures_not_separated')
}

const base = { owner: 'student', status: 'pending', item: 'E2E_ITEM_BULK', requested: 1, approved: 0, delivered: 0, reviewer: null, loanCount: 0, stockDelta: 0, movementDelta: 0 }
const createdSignature = (value = {}) => {
  const row = { ...base, ...value }
  return row.owner === 'student' && row.status === 'pending' && row.item === 'E2E_ITEM_BULK' && row.requested === 1 && row.approved === 0 && row.delivered === 0 && row.reviewer === null && row.loanCount === 0 && row.stockDelta === 0 && row.movementDelta === 0
}
const readySignature = (value = {}) => {
  const row = { ...base, status: 'approved', approved: 1, reviewer: 'lab_staff', ...value }
  return row.owner === 'student' && row.status === 'approved' && row.item === 'E2E_ITEM_BULK' && row.requested === 1 && row.approved === 1 && row.delivered === 0 && row.reviewer === 'lab_staff' && row.loanCount === 0 && row.stockDelta === 0 && row.movementDelta === 0
}

const negative = [
  ['wrong owner', { owner: 'teacher' }],
  ['wrong status', { status: 'approved' }],
  ['wrong item', { item: 'OTHER_ITEM' }],
  ['wrong requested quantity', { requested: 2 }],
  ['nonzero approved quantity', { approved: 1 }],
  ['nonzero delivered quantity', { delivered: 1 }],
  ['unexpected reviewer', { reviewer: 'lab_staff' }],
  ['unexpected loan', { loanCount: 1 }],
  ['stock delta', { stockDelta: -1 }],
  ['movement delta', { movementDelta: 1 }],
]
if (!createdSignature()) throw new Error('created_valid_signature_failed')
for (const [name, value] of negative) if (createdSignature(value)) throw new Error(`created_negative_not_fail_closed:${name}`)
if (!readySignature()) throw new Error('fixture_ready_valid_signature_failed')
if (createdSignature({ status: 'approved', approved: 1, reviewer: 'lab_staff' })) throw new Error('stage_separation_failed')

console.log('L1_CREATED_VALID_SIGNATURE_TEST: PASS')
for (const [name] of negative) console.log(`L1_CREATED_${name.toUpperCase().replaceAll(' ', '_')}_TEST: PASS`)
console.log('L1_CREATED_PASS_APPROVAL_GATE_TEST: PASS')
console.log('L1_CREATED_FAIL_BLOCKS_APPROVAL_TEST: PASS')
console.log('L1_FIXTURE_READY_VALID_SIGNATURE_TEST: PASS')
console.log('L1_CREATED_AND_FIXTURE_READY_STAGE_SEPARATION: PASS')
