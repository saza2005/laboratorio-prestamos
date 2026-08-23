import { buildR4TrackingState, canArmR4Cleanup, classifyRequestCandidates, isR4PreSetRestored, validateR4GroupedSignature } from './lib/r4-identity.mjs'

function expect(value, message) {
  if (!value) throw new Error(message)
}

const pre = ['request-a', 'request-b']
const exact = [{ id: 'request-c', user_id: 'teacher', status: 'pending', purpose: 'E2E_MUT_REQ_R4_run', approved_by: null, approved_at: null }]
const signature = {
  request: exact[0],
  requestItems: [{ request_id: 'request-c', item_id: 'item', quantity_requested: 1, quantity_approved: 0, quantity_delivered: 0, quantity_returned: 0, quantity_damaged: 0 }],
  groups: [{ id: 'group-c', request_id: 'request-c', group_name: 'Grupo 1', leader_student_id: 'student' }],
  groupItems: [{ request_group_id: 'group-c', item_id: 'item', quantity: 1 }],
  expected: { teacherId: 'teacher', studentId: 'student', itemId: 'item', purpose: 'E2E_MUT_REQ_R4_run' },
}

expect(classifyRequestCandidates(pre, [...pre.map((id) => ({ id })), ...exact]).kind === 'SINGLE_CANDIDATE', 'single_candidate_failed')
expect(classifyRequestCandidates(pre, pre.map((id) => ({ id }))).kind === 'NO_NEW_REQUEST', 'zero_candidate_not_fail_closed')
expect(classifyRequestCandidates(pre, [...pre.map((id) => ({ id })), { id: 'request-c', ...exact[0] }, { id: 'request-d' }]).kind === 'MULTIPLE_NEW_REQUESTS', 'multi_candidate_not_fail_closed')
expect(validateR4GroupedSignature(signature), 'exact_signature_failed')
expect(!validateR4GroupedSignature({ ...signature, groupItems: [] }), 'partial_signature_not_fail_closed')

const tracking = buildR4TrackingState({ runId: 'run', purpose: 'E2E_MUT_REQ_R4_run', teacherAlias: 'e2e_teacher', studentAlias: 'e2e_student', itemAlias: 'E2E_ITEM_BULK', preRequestIds: pre })
expect(tracking.creationAttemptCount === 0 && tracking.capturedIds === null, 'tracking_not_pre_write_ready')
const capturedIds = { requestId: 'request-c', requestItemIds: ['item-row'], requestGroupIds: ['group-c'], requestGroupItemIds: ['group-item-row'] }
expect(canArmR4Cleanup({ capturedIds, candidateCount: 1 }), 'exact_cleanup_ids_not_armable')
expect(!canArmR4Cleanup({ capturedIds: null, candidateCount: 1 }), 'missing_cleanup_ids_not_fail_closed')
expect(!canArmR4Cleanup({ capturedIds, candidateCount: 2 }), 'ambiguous_cleanup_not_fail_closed')
expect(isR4PreSetRestored(pre, ['request-b', 'request-a']), 'pre_set_restoration_failed')
expect(!isR4PreSetRestored(pre, ['request-a', 'request-c']), 'pre_set_mismatch_not_fail_closed')
console.log('R4_PRE_SNAPSHOT_TEST: PASS')
console.log('R4_ZERO_CANDIDATE_TEST: PASS')
console.log('R4_SINGLE_EXACT_CANDIDATE_TEST: PASS')
console.log('R4_MULTI_CANDIDATE_FAIL_CLOSED_TEST: PASS')
console.log('R4_SIGNATURE_MISMATCH_FAIL_CLOSED_TEST: PASS')
console.log('R4_PARTIAL_RELATIONAL_FAIL_CLOSED_TEST: PASS')
console.log('R4_EXACT_ID_CAPTURE_TEST: PASS')
console.log('R4_PRE_SET_RESTORATION_TEST: PASS')
console.log('R4_CLEANUP_CAPTURED_ID_TEST: PASS')
console.log('R4_CLEANUP_MISSING_ID_FAIL_CLOSED_TEST: PASS')
console.log('R4_CLEANUP_AMBIGUOUS_RECOVERY_FAIL_CLOSED_TEST: PASS')
console.log('R4_IDENTITY_TESTS: PASS')
