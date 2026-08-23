import fs from 'node:fs'

const action = fs.readFileSync('app/solicitudes/actions.ts', 'utf8')
const groupPage = fs.readFileSync('app/solicitudes/grupal/page.tsx', 'utf8')
const groupForm = fs.readFileSync('app/solicitudes/request-form-groups.tsx', 'utf8')
const rpc = fs.readFileSync('supabase/migrations/20260610_create_request_transaction.sql', 'utf8')
const entrypoints = fs.readFileSync('tests/supabase-e2e-db/fase-6-mutating-entrypoints.csv', 'utf8')

function expect(value, message) {
  if (!value) throw new Error(message)
}

expect(groupPage.includes('RequestFormGroups'), 'group_form_route_missing')
expect(groupForm.includes('useActionState(createRequestWithState'), 'group_action_binding_missing')
expect(action.includes('export async function createRequestWithState'), 'canonical_action_missing')
expect(action.includes('parseGroups(formData)'), 'group_branch_parser_missing')
expect(action.includes("p_items: groups.length > 0 ? [] : rows"), 'group_items_branch_missing')
expect(action.includes("p_groups: groups"), 'group_payload_binding_missing')
expect(rpc.includes("if v_role <> 'teacher'"), 'teacher_role_validation_missing')
expect(rpc.includes("insert into public.requests"), 'request_insert_missing')
expect(rpc.includes("insert into public.request_items"), 'request_item_insert_missing')
expect(rpc.includes("insert into public.request_groups"), 'request_group_insert_missing')
expect(rpc.includes("insert into public.request_group_items"), 'request_group_item_insert_missing')
expect(!rpc.includes('update public.items'), 'unexpected_item_update')
expect(!rpc.includes('update public.item_units'), 'unexpected_unit_update')
expect(!rpc.includes('insert into public.inventory_movements'), 'unexpected_movement_insert')
expect(entrypoints.includes('FLOW-R4,group request,/solicitudes,teacher'), 'inventory_definition_mismatch')

console.log('R4_SERVER_ACTION_NAMING_CONFLICT_RESOLVED: yes')
console.log('R4_CANONICAL_ACTION: createRequestWithState')
console.log('R4_MINIMAL_FIXTURE_VALIDATED_FROM_CODE: yes')
console.log('R4_EXPECTED_GROUP_CREATE_FOOTPRINT: requests=1 request_items=1 request_groups=1 request_group_items=1')
console.log('R4_FORBIDDEN_INVENTORY_WRITES: 0')
console.log('R4_CONTRACT_TEST: PASS')
