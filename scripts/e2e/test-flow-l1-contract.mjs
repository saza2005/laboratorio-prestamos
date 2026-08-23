import fs from 'node:fs'

const csv = fs.readFileSync('tests/supabase-e2e-db/fase-6-mutating-entrypoints.csv', 'utf8')
const action = fs.readFileSync('app/dashboard/solicitudes/actions.ts', 'utf8')
const delivery = fs.readFileSync('supabase/migrations/20260628_allow_partial_request_delivery.sql', 'utf8')
const loan = fs.readFileSync('app/prestamos/actions.ts', 'utf8')
const loanRpc = fs.readFileSync('supabase/migrations/20260613_create_multi_item_loan_transaction.sql', 'utf8')
const helper = fs.readFileSync('tests/e2e/mutating/helpers/deliver-request-action.ts', 'utf8')

assert(csv.includes('FLOW-L1,deliver approved request'))
assert(csv.includes('FLOW-L2,direct loan'))
assert(action.includes('export async function deliverRequestWithState'))
assert(action.includes("supabase.rpc('deliver_approved_request_with_units'"))
assert(delivery.includes('p_request_id uuid,\n  p_units jsonb,\n  p_items jsonb,\n  p_delivered_by uuid'))
assert(delivery.includes("set status = 'delivered'"))
assert(delivery.includes("insert into public.loans"))
assert(delivery.includes("insert into public.loan_items"))
assert(delivery.includes("movement_type, quantity, reference_table"))
assert(loan.includes("supabase.rpc('create_multi_item_loan_transaction'"))
assert(loanRpc.includes('p_user_id uuid,\n  p_items jsonb'))
assert(!helper.includes('.first(') && !helper.includes('.last(') && !helper.includes('.nth('))
assert(!helper.includes('.click(') && !helper.includes('requestSubmit') && !helper.includes('form.submit'))
console.log('L1_DEFINITION_CONTRACT_TEST: PASS')
console.log('L1_L2_DISTINCTION_TEST: PASS')
console.log('L1_ACTIVE_DELIVERY_OVERLOAD_TEST: PASS')
console.log('L1_NO_CRITICAL_POSITIONAL_LOCATORS_TEST: PASS')

function assert(value) {
  if (!value) throw new Error('l1_contract_assertion_failed')
}
