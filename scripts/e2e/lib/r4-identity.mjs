export function getNewRequestCandidates(preRequestIds, postRequests) {
  const pre = new Set(preRequestIds)
  return postRequests.filter((request) => !pre.has(request.id))
}

export function classifyRequestCandidates(preRequestIds, postRequests) {
  const candidates = getNewRequestCandidates(preRequestIds, postRequests)
  if (candidates.length === 0) return { kind: 'NO_NEW_REQUEST', candidates }
  if (candidates.length > 1) return { kind: 'MULTIPLE_NEW_REQUESTS', candidates }
  return { kind: 'SINGLE_CANDIDATE', candidates }
}

export function validateR4GroupedSignature({ request, requestItems, groups, groupItems, expected }) {
  if (!request || request.user_id !== expected.teacherId || request.status !== 'pending') return false
  if (request.purpose !== expected.purpose || request.approved_by !== null || request.approved_at !== null) return false
  if (requestItems.length !== 1 || groups.length !== 1 || groupItems.length !== 1) return false

  const item = requestItems[0]
  const group = groups[0]
  const groupItem = groupItems[0]
  return item.request_id === request.id &&
    item.item_id === expected.itemId &&
    item.quantity_requested === 1 &&
    item.quantity_approved === 0 &&
    item.quantity_delivered === 0 &&
    item.quantity_returned === 0 &&
    item.quantity_damaged === 0 &&
    group.request_id === request.id &&
    group.group_name === 'Grupo 1' &&
    group.leader_student_id === expected.studentId &&
    groupItem.request_group_id === group.id &&
    groupItem.item_id === expected.itemId &&
    groupItem.quantity === 1
}

export function buildR4TrackingState({ runId, purpose, teacherAlias, studentAlias, itemAlias, preRequestIds }) {
  return {
    version: 1,
    flow: 'FLOW-R4',
    runId,
    purpose,
    teacherAlias,
    studentAlias,
    itemAlias,
    preRequestIds: [...preRequestIds],
    creationAttemptCount: 0,
    capturedIds: null,
  }
}

export function canArmR4Cleanup({ capturedIds, candidateCount }) {
  if (candidateCount !== 1 || !capturedIds) return false
  return Boolean(
    capturedIds.requestId &&
    Array.isArray(capturedIds.requestItemIds) &&
    Array.isArray(capturedIds.requestGroupIds) &&
    Array.isArray(capturedIds.requestGroupItemIds) &&
    capturedIds.requestItemIds.length === 1 &&
    capturedIds.requestGroupIds.length === 1 &&
    capturedIds.requestGroupItemIds.length === 1,
  )
}

export function isR4PreSetRestored(preRequestIds, postRequestIds) {
  const expected = [...new Set(preRequestIds)].sort()
  const actual = [...new Set(postRequestIds)].sort()
  return expected.length === actual.length && expected.every((id, index) => id === actual[index])
}
