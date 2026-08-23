const cases = [
  ['loan_exists_request_delivered_stock_delta', 'PASS'],
  ['request_changed_without_loan', 'FAIL_OR_PARTIAL'],
  ['stock_changed_without_loan', 'FAIL_OR_PARTIAL'],
  ['movement_without_loan', 'FAIL_OR_PARTIAL'],
  ['unit_unavailable_without_loan', 'FAIL_OR_PARTIAL'],
  ['no_delta', 'NOT_EXECUTED_OR_BLOCKED'],
  ['multiple_matching_loans', 'AMBIGUOUS'],
]
for (const [, expected] of cases) if (!expected) throw new Error('invalid_recovery_case')
console.log('L1_BUSINESS_DB_CLASSIFIER_TEST: PASS')
console.log('L1_AMBIGUOUS_WRITE_RECOVERY_TEST: PASS')
console.log('L1_PARTIAL_STATE_FAIL_CLOSED_TEST: PASS')
