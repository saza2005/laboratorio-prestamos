import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createAdminReadClient } from './lib/mutating-remote.mjs'

const root = '/home/saza/Proyectos/laboratorio-prestamos-e2e'
const snapshotPath = '.e2e-state/runtime/l1-b-snapshot.json'
const historyPath = '.e2e-state/runtime/l1-b-attempt-history.json'
const expected = {
  runner: '4c2264a58b5ef2ee90bdb9dd22bf82c475b83d36302968412b8601247689bcd3',
  cleanup: '1bf5f5d8e69cf4b463804f67e0fce28f1f35f454d1faa10685a6c1fea55359d0',
  f3ig: '54dde36c5ea18e37e6432bd36433caa288dfe5d99a8cb594ed667b1de5826648',
  currentF3ig: 'b3e9bf4f39b951aad1647553ddc0efbaaa5cf60e4344ccd671c6df4572126afc',
}

function fail(code) {
  console.error(`L1_F3LM_RECOVERY: FAIL_CLOSED (${code})`)
  process.exitCode = 1
  throw new Error(code)
}

function requireProof(condition, code) {
  if (!condition) fail(code)
}

async function hashFile(file) {
  return crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex')
}

async function writeAtomic(file, value) {
  const temp = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`
  const handle = await fs.open(temp, 'w', 0o600)
  try {
    await handle.writeFile(JSON.stringify(value, null, 2) + '\n')
    await handle.sync()
  } finally {
    await handle.close()
  }
  await fs.rename(temp, file)
  const directory = await fs.open(path.dirname(file), 'r')
  await directory.sync()
  await directory.close()
}

function ids(rows) {
  return new Set((rows ?? []).map((row) => row.id))
}

async function read(query, code) {
  const result = await query
  requireProof(!result.error, code)
  return result.data
}

async function readGraph(admin, state) {
  const request = await read(admin.from('requests').select('id,user_id,status,purpose,e2e_fixture_token').eq('id', state.requestId).maybeSingle(), 'request_read_failed')
  const requestItems = await read(admin.from('request_items').select('id,request_id,item_id,quantity_requested,quantity_approved,quantity_delivered').eq('request_id', state.requestId), 'request_items_read_failed')
  const requestGroups = await read(admin.from('request_groups').select('id,request_id').eq('request_id', state.requestId), 'request_groups_read_failed')
  const groupItems = requestGroups.length ? await read(admin.from('request_group_items').select('id,request_group_id').in('request_group_id', requestGroups.map((row) => row.id)), 'request_group_items_read_failed') : []
  const loans = await read(admin.from('loans').select('id,request_id,user_id,status,delivered_by').eq('request_id', state.requestId), 'loans_read_failed')
  const loanItems = loans.length ? await read(admin.from('loan_items').select('id,loan_id,item_id,item_unit_id,quantity,returned_quantity,damaged_quantity,missing_quantity').in('loan_id', loans.map((row) => row.id)), 'loan_items_read_failed') : []
  const loanGroups = loans.length ? await read(admin.from('loan_groups').select('id,loan_id').in('loan_id', loans.map((row) => row.id)), 'loan_groups_read_failed') : []
  const loanGroupItems = loanGroups.length ? await read(admin.from('loan_group_items').select('id,loan_group_id').in('loan_group_id', loanGroups.map((row) => row.id)), 'loan_group_items_read_failed') : []
  const returns = loans.length ? await read(admin.from('returns').select('id,loan_id').in('loan_id', loans.map((row) => row.id)), 'returns_read_failed') : []
  const item = await read(admin.from('items').select('id,track_individual,stock_available').eq('id', state.referenceIds.itemId).maybeSingle(), 'item_read_failed')
  const units = await read(admin.from('item_units').select('id,item_id').eq('item_id', state.referenceIds.itemId), 'item_units_read_failed')
  const movements = await read(admin.from('inventory_movements').select('id,item_id,movement_type,quantity,reference_table,reference_id').eq('item_id', state.referenceIds.itemId), 'inventory_movements_read_failed')
  const movementBaseline = ids(state.movementsBefore)
  const unitBaseline = ids(state.unitsBefore)
  return {
    request,
    requestItems,
    requestGroups,
    groupItems,
    loans,
    loanItems,
    loanGroups,
    loanGroupItems,
    returns,
    item,
    units,
    movements,
    newMovements: movements.filter((row) => !movementBaseline.has(row.id)),
    newUnits: units.filter((row) => !unitBaseline.has(row.id)),
  }
}

function classify(graph, state) {
  const owned = graph.request && graph.request.id === state.requestId && graph.request.user_id === state.referenceIds.studentId && graph.request.purpose === state.purpose && graph.request.e2e_fixture_token === state.ownershipToken
  const exactItem = graph.requestItems.length === 1 && graph.requestItems[0].id === state.requestItemId && graph.requestItems[0].request_id === state.requestId && graph.requestItems[0].item_id === state.referenceIds.itemId && graph.requestItems[0].quantity_requested === 1
  const compatible = graph.requestGroups.length === 0 && graph.groupItems.length === 0 && graph.loanGroups.length === 0 && graph.loanGroupItems.length === 0 && graph.returns.length === 0 && graph.newUnits.length === 0
  const baselineStock = graph.item && graph.item.id === state.referenceIds.itemId && graph.item.track_individual === false
  const approved = owned && graph.request.status === 'approved' && exactItem && graph.requestItems[0].quantity_approved === 1 && graph.requestItems[0].quantity_delivered === 0 && graph.loans.length === 0 && graph.loanItems.length === 0 && graph.newMovements.length === 0 && baselineStock && graph.item.stock_available === state.itemBefore.stock_available && compatible
  const loan = graph.loans.length === 1 ? graph.loans[0] : null
  const loanItem = graph.loanItems.length === 1 ? graph.loanItems[0] : null
  const movement = graph.newMovements.length === 1 ? graph.newMovements[0] : null
  const delivered = owned && graph.request.status === 'delivered' && exactItem && graph.requestItems[0].quantity_approved === 1 && graph.requestItems[0].quantity_delivered === 1 && loan && loan.request_id === state.requestId && loan.user_id === state.referenceIds.studentId && loan.status === 'active' && loanItem && loanItem.loan_id === loan.id && loanItem.item_id === state.referenceIds.itemId && loanItem.item_unit_id === null && loanItem.quantity === 1 && loanItem.returned_quantity === 0 && loanItem.damaged_quantity === 0 && loanItem.missing_quantity === 0 && movement && movement.movement_type === 'loan_out' && movement.quantity === 1 && movement.reference_table === 'loans' && movement.reference_id === loan.id && baselineStock && graph.item.stock_available === state.itemBefore.stock_available - 1 && compatible
  if (approved) return { name: 'APPROVED_PREDELIVERY_OWNED_RESIDUAL', delivery: 'PROVEN_NOT_OCCURRED', loan, loanItem, movement }
  if (delivered) return { name: 'FULLY_DELIVERED_MINIMAL_BULK_OWNED_RESIDUAL', delivery: 'PROVEN_OCCURRED', loan, loanItem, movement }
  const clean = !graph.request && graph.requestItems.length === 0 && graph.requestGroups.length === 0 && graph.groupItems.length === 0 && graph.loans.length === 0 && graph.loanItems.length === 0 && graph.loanGroups.length === 0 && graph.loanGroupItems.length === 0 && graph.returns.length === 0 && graph.newMovements.length === 0 && graph.newUnits.length === 0 && baselineStock && graph.item.stock_available === state.itemBefore.stock_available
  if (clean) return { name: 'NO_OWNED_RESIDUAL_ALREADY_CLEAN', delivery: 'UNPROVEN', loan, loanItem, movement }
  fail('unexpected_or_ambiguous_owned_graph')
}

async function deleteExactly(admin, table, predicates, code) {
  let query = admin.from(table).delete().select('id')
  for (const [key, value] of Object.entries(predicates)) query = query.eq(key, value)
  const result = await query
  requireProof(!result.error && (result.data ?? []).length === 1, code)
}

requireProof(process.cwd() === root, 'wrong_project_workdir')
try { process.loadEnvFile('.env.e2e') } catch { fail('env_e2e_load_failed') }
const state = JSON.parse(await fs.readFile(snapshotPath, 'utf8'))
requireProof(state.flow === 'FLOW-L1' && state.requestCreateAttempt === 1 && state.approvalAttempt === 1 && state.deliveryAttempt === 1 && state.cleanupAttempt === 1, 'current_attempt_tracker_invalid')
requireProof(state.fixtureReady === true && state.remoteWriteConfirmed === true && state.requestId && state.requestItemId && state.ownershipToken, 'current_attempt_metadata_invalid')
requireProof(state.referenceIds?.studentId && state.referenceIds?.staffId && state.referenceIds?.itemId && state.itemBefore, 'baseline_metadata_missing')
const envText = await fs.readFile('.env.e2e', 'utf8')
const expectedRef = (envText.match(/^E2E_EXPECTED_PROJECT_REF=(.+)$/m) ?? [])[1]?.trim()
const publicUrl = (envText.match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m) ?? [])[1]?.trim()
requireProof(expectedRef && publicUrl === `https://${expectedRef}.supabase.co`, 'e2e_project_identity')
const currentArtifactHashes = {
  runner: await hashFile('scripts/e2e/run-flow-l1-b-delivery-v4.mjs'),
  cleanup: await hashFile('scripts/e2e/cleanup-l1-delivery-fixture-v2.mjs'),
  f3ig: await hashFile('tests/e2e/mutating/request-delivery-l1-b.actual.spec.ts'),
}
requireProof(currentArtifactHashes.runner === expected.runner && currentArtifactHashes.cleanup === expected.cleanup, 'artifact_hash_mismatch')
requireProof(currentArtifactHashes.f3ig === expected.f3ig || currentArtifactHashes.f3ig === expected.currentF3ig, 'artifact_hash_mismatch')
const artifactHashes = { ...currentArtifactHashes, f3ig: expected.f3ig }
const history = JSON.parse(await fs.readFile(historyPath, 'utf8'))
requireProof(Array.isArray(history.records) && history.records.length >= 1, 'prior_history_missing')

const admin = createAdminReadClient()
const graph = await readGraph(admin, state)
const classification = classify(graph, state)

if (classification.name === 'FULLY_DELIVERED_MINIMAL_BULK_OWNED_RESIDUAL') {
  const restored = await admin.from('items').update({ stock_available: state.itemBefore.stock_available }).eq('id', state.referenceIds.itemId).eq('stock_available', state.itemBefore.stock_available - 1).select('id')
  requireProof(!restored.error && (restored.data ?? []).length === 1, 'stock_restore_failed')
  await deleteExactly(admin, 'inventory_movements', { id: classification.movement.id, item_id: state.referenceIds.itemId, reference_id: classification.loan.id }, 'movement_delete_failed')
  await deleteExactly(admin, 'loan_items', { id: classification.loanItem.id, loan_id: classification.loan.id }, 'loan_item_delete_failed')
  await deleteExactly(admin, 'loans', { id: classification.loan.id, request_id: state.requestId }, 'loan_delete_failed')
  await deleteExactly(admin, 'request_items', { id: state.requestItemId, request_id: state.requestId }, 'request_item_delete_failed')
  await deleteExactly(admin, 'requests', { id: state.requestId, e2e_fixture_token: state.ownershipToken }, 'request_delete_failed')
} else if (classification.name === 'APPROVED_PREDELIVERY_OWNED_RESIDUAL') {
  await deleteExactly(admin, 'request_items', { id: state.requestItemId, request_id: state.requestId }, 'request_item_delete_failed')
  await deleteExactly(admin, 'requests', { id: state.requestId, e2e_fixture_token: state.ownershipToken }, 'request_delete_failed')
}

const postGraph = await readGraph(admin, state)
const postClass = classify(postGraph, { ...state, purpose: state.purpose })
requireProof(postClass.name === 'NO_OWNED_RESIDUAL_ALREADY_CLEAN', 'remote_post_verify_failed')
const currentHistory = JSON.parse(await fs.readFile(historyPath, 'utf8'))
const record = {
  schemaVersion: 1,
  state: 'RECOVERED_AND_ARCHIVED',
  archivedAt: new Date().toISOString(),
  flow: 'FLOW-L1',
  sourceTrackerSha256: await hashFile(snapshotPath),
  consumedAttemptCounters: { requestCreateAttempt: state.requestCreateAttempt, approvalAttempt: state.approvalAttempt, deliveryAttempt: state.deliveryAttempt, cleanupAttempt: state.cleanupAttempt },
  attemptOutcome: classification.name,
  businessDeliveryRemoteWrite: classification.delivery,
  recovery: { tool: 'recover-l1-current-attempt-f3lm.mjs', result: 'MUTATION_COMPLETE_POST_VERIFY_PASS', consumed: true },
  artifactHashes,
  currentArtifactHashes,
  historicalBudgetsPreserved: true,
  failedAttemptHistoryPreserved: true,
}
currentHistory.records.push(record)
await writeAtomic(historyPath, currentHistory)
const verifiedHistory = JSON.parse(await fs.readFile(historyPath, 'utf8'))
requireProof(verifiedHistory.records.length === currentHistory.records.length, 'history_append_verification_failed')

const runId = 'L1-B-' + Date.now().toString(36) + '-' + crypto.randomUUID().slice(0, 8)
const active = {
  ...state,
  runId,
  purpose: `E2E_MUT_REQ_L1_${runId}`,
  loanMarker: `E2E_MUT_LOAN_L1_${runId}`,
  requestCreateAttempt: 0,
  approvalAttempt: 0,
  deliveryAttempt: 0,
  cleanupAttempt: 0,
  remoteWriteConfirmed: false,
  fixtureReady: false,
  capturedAt: new Date().toISOString(),
  requestId: undefined,
  requestItemId: undefined,
  ownershipToken: undefined,
  createFailureClass: undefined,
}
await writeAtomic(snapshotPath, active)
const final = JSON.parse(await fs.readFile(snapshotPath, 'utf8'))
requireProof(final.requestCreateAttempt === 0 && final.approvalAttempt === 0 && final.deliveryAttempt === 0 && final.cleanupAttempt === 0 && !final.requestId && !final.requestItemId && !final.ownershipToken && final.fixtureReady !== true, 'tracker_rollover_failed')
console.log(`L1_F3LM_RECOVERY: PASS ${classification.name} DELIVERY=${classification.delivery} REMOTE_POST_VERIFY=PASS HISTORY_APPEND=PASS TRACKER_POSTSTATE=PRISTINE`)
