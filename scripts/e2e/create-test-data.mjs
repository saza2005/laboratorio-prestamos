#!/usr/bin/env node
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const batches = new Set(['A', 'B', 'C', 'D'])
const args = new Set(process.argv.slice(2))
for (const arg of args) if (!['--dry-run', '--execute', '--confirm-e2e', '--batch=A', '--batch=B', '--batch=C', '--batch=D','--scenario=C1','--scenario=C2','--scenario=C3','--scenario=D1'].includes(arg)) fail('unknown_argument')
if (!args.has('--confirm-e2e')) fail('missing_confirm_e2e')
if (args.has('--dry-run') === args.has('--execute')) fail('choose_one_mode')
const batchArg = [...args].find((arg) => arg.startsWith('--batch='))
if (!batchArg || !batches.has(batchArg.slice(8))) fail('invalid_batch')
const batch = batchArg.slice(8)
const scenarioArg = [...args].find((arg) => arg.startsWith('--scenario='))
const scenario = scenarioArg?.slice(11)
if (scenarioArg && !((batch === 'C' && ['C1', 'C2', 'C3'].includes(scenario)) || (batch === 'D' && scenario === 'D1'))) fail('invalid_scenario')
if (!['A','B','C','D'].includes(batch)) fail('batch_not_prepared_' + batch)
const env = loadEnv()
const state = loadState()
validateContext(env, state)
const admin = createClient(env.url, env.serviceKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
await verifyAuthAndProfiles(admin, state)
const existing = batch === 'A' ? await readExisting(admin) : batch === 'B' ? await readExistingRequests(admin) : batch === 'D' ? await readExistingMaintenance(admin) : await readExistingLoans(admin)
const dependencies = batch === 'B' ? await readRequestDependencies(admin, state) : batch === 'C' ? await readLoanDependencies(admin, state) : batch === 'D' ? await readMaintenanceDependencies(admin, state) : null
const results = batch === 'A' ? classify(existing) : batch === 'B' ? classifyRequests(existing, dependencies) : batch === 'C' ? classifyLoans(existing, dependencies).filter((result) => !scenario || result.alias === (scenario === 'C1' ? 'E2E_LOAN_ACTIVE' : scenario === 'C2' ? 'E2E_LOAN_PARTIAL_RETURN' : 'E2E_LOAN_FULL_RETURN')) : classifyMaintenance(existing, dependencies).filter((result) => !scenario || result.alias === 'E2E_MAINTENANCE_ACTIVE_01')
if (batch === 'A') {
  console.log('items_before: ' + existing.items.length)
  console.log('item_units_before: ' + existing.units.length)
} else if (batch === 'B') {
  console.log('requests_before: ' + existing.requests.length)
  console.log('request_items_before: ' + existing.requestItems.length)
  console.log('request_groups_before: ' + existing.requestGroups.length)
  console.log('request_group_items_before: ' + existing.requestGroupItems.length)
} else if (batch === 'C') {
  console.log('loans_before: ' + existing.loans.length)
  console.log('loan_items_before: ' + existing.loanItems.length)
  console.log('returns_before: ' + existing.returns.length)
  console.log('return_items_before: ' + existing.returnItems.length)
} else {
  console.log('maintenance_before: ' + existing.maintenance.length)
  console.log('inventory_movements_before: ' + existing.movements.length)
  console.log('unit_001_before: ' + (dependencies.unit?.condition ?? 'missing') + '/' + (dependencies.unit?.availability_status ?? 'missing'))
  console.log('unit_002_before: ' + (dependencies.otherUnit?.condition ?? 'missing') + '/' + (dependencies.otherUnit?.availability_status ?? 'missing'))
}
for (const result of results) console.log(result.alias + ': ' + result.status)
if (results.some((result) => result.status.startsWith('CONFLICT') || result.status.startsWith('BLOCKED'))) fail('batch_' + batch.toLowerCase() + '_conflict_or_block')
if (args.has('--dry-run')) { console.log('mode: dry-run; writes: 0; test_data_state: unchanged'); process.exit(0) }
if (batch === 'B') {
  if (process.env.E2E_TEST_DATA_CONFIRM !== 'CREATE_E2E_TEST_DATA_BATCH_B') fail('missing_batch_confirmation')
  await executeBatchB({ env, state, admin, dependencies })
  process.exit(0)
}
if (batch === 'C') {
  if (!scenario) fail('scenario_required_for_authorized_c_execution')
  if (scenario === 'C1') {
    if (process.env.E2E_TEST_DATA_CONFIRM !== 'CREATE_E2E_TEST_DATA_BATCH_C_C1') fail('missing_c1_confirmation')
    await executeBatchC1({ env, state, admin, dependencies })
  } else if (scenario === 'C2') {
    if (process.env.E2E_TEST_DATA_CONFIRM !== 'CREATE_E2E_TEST_DATA_BATCH_C_C2') fail('missing_c2_confirmation')
    await executeBatchC2({ env, state, admin, dependencies })
  } else if (scenario === 'C3') {
    if (process.env.E2E_TEST_DATA_CONFIRM !== 'CREATE_E2E_TEST_DATA_BATCH_C_C3') fail('missing_c3_confirmation')
    await executeBatchC3({ env, state, admin, dependencies })
  }
  process.exit(0)
}
if (batch === 'D') {
  if (scenario !== 'D1') fail('scenario_required_for_authorized_d_execution')
  if (process.env.E2E_TEST_DATA_CONFIRM !== 'CREATE_E2E_TEST_DATA_BATCH_D_D1') fail('missing_d1_confirmation')
  await executeBatchD1({ env, state, admin, dependencies })
  process.exit(0)
}
if (process.env.E2E_TEST_DATA_CONFIRM !== 'CREATE_E2E_TEST_DATA_BATCH_A') fail('missing_batch_confirmation')
if (state.profiles.profiles.e2e_lab_staff?.role !== 'lab_staff') fail('lab_staff_actor_not_authorized')
const anon = createClient(env.url, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
const { error: signInError } = await anon.auth.signInWithPassword({ email: env.labStaffEmail, password: env.labStaffPassword })
if (signInError) fail('authenticated_admin_session_failed')
const records = {}
for (const item of itemDefinitions()) {
  const found = existing.items.find((row) => row.code === item.code)
  let itemId = found?.id
  if (!itemId) {
    const { data, error } = await anon.rpc('create_inventory_item_transaction', item.rpcArgs)
    if (error || !data) fail('item_rpc_failed_' + item.alias)
    itemId = data
  }
  records[item.alias] = { id: itemId, table: 'items', batch: 'A', code: item.code, dependencies: ['profile:e2e_lab_staff'] }
  if (item.track) {
    const units = await readUnits(admin, item.serials)
    records.E2E_UNIT_TRACKED_01 = { id: units.find((row) => row.serial_code === item.serials[0])?.id, table: 'item_units', batch: 'A', serial_code: item.serials[0], dependencies: ['item:E2E_ITEM_TRACKED'] }
    records.E2E_UNIT_TRACKED_02 = { id: units.find((row) => row.serial_code === item.serials[1])?.id, table: 'item_units', batch: 'A', serial_code: item.serials[1], dependencies: ['item:E2E_ITEM_TRACKED'] }
  }
  await writeState(env.expectedRef, records)
}
console.log('mode: execute; test_data_state: written_without_secrets')
async function executeBatchB({ env, state, admin, dependencies }) {
  const records = {}
  for (const scenario of requestDefinitions(dependencies)) {
    const actor = await authenticatedClient(env, scenario.actor)
    const created = await actor.rpc('create_request_transaction', scenario.create)
    if (created.error || !created.data) fail('request_rpc_failed_' + scenario.alias)
    const requestId = created.data
    records[scenario.alias] = { id: requestId, table: 'requests', batch: 'B', requester_alias: scenario.actor, item_alias: scenario.item, status: 'pending', dependencies: ['item:' + scenario.item] }
    await writeState(env.expectedRef, records)
    if (scenario.transition?.status === 'rejected') {
      const result = await reviewerRpc(env, 'reject_request_transaction', { p_request_id: requestId, p_rejection_reason: 'E2E planned rejection' })
      if (result.error) fail('request_transition_failed_' + scenario.alias)
    } else if (scenario.transition?.status === 'approved') {
      const children = await admin.from('request_items').select('id').eq('request_id', requestId)
      if (children.error || !children.data?.length) fail('request_items_missing_' + scenario.alias)
      const result = await reviewerRpc(env, 'approve_request_transaction', { p_request_id: requestId, p_items: children.data.map((row) => ({ request_item_id: row.id, quantity_approved: 1 })) })
      if (result.error) fail('request_transition_failed_' + scenario.alias)
    }
    if (scenario.transition) { records[scenario.alias].status = scenario.transition.status; await writeState(env.expectedRef, records) }
    console.log(scenario.alias + ': CREATED')
  }
}
async function reviewerRpc(env, name, args) { const client = createClient(env.url, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }); const { error } = await client.auth.signInWithPassword({ email: env.labStaffEmail, password: env.labStaffPassword }); if (error) fail('reviewer_session_failed'); return client.rpc(name, args) }
async function authenticatedClient(env, alias) { const config = alias === 'e2e_student' ? [env.studentEmail, env.studentPassword] : alias === 'e2e_teacher' ? [env.teacherEmail, env.teacherPassword] : alias === 'e2e_lab_staff' ? [env.labStaffEmail, env.labStaffPassword] : null; if (!config) fail('unknown_authenticated_actor'); const [email, password] = config; const client = createClient(env.url, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }); const { error } = await client.auth.signInWithPassword({ email, password }); if (error) fail('requester_session_failed'); return client }

async function readExistingLoans(client) {
  const qs=await Promise.all([client.from('loans').select('id,request_id,user_id,status,notes'),client.from('loan_items').select('id,loan_id,item_id,item_unit_id,quantity,returned_quantity'),client.from('loan_groups').select('id,loan_id'),client.from('loan_group_items').select('id,loan_group_id,item_id,quantity'),client.from('returns').select('id,loan_id'),client.from('return_items').select('id,return_id,loan_item_id,quantity_ok,quantity_damaged,quantity_missing')]); if(qs.some(q=>q.error)) fail('loans_read_failed'); return {loans:qs[0].data??[],loanItems:qs[1].data??[],loanGroups:qs[2].data??[],loanGroupItems:qs[3].data??[],returns:qs[4].data??[],returnItems:qs[5].data??[]}
}
async function readLoanDependencies(client,state) {
  const items=await client.from('items').select('id,code,status,stock_available,track_individual').in('code',['E2E_ITEM_BULK','E2E_ITEM_TRACKED']);
  const units=await client.from('item_units').select('id,serial_code,condition,availability_status,item_id').in('serial_code',['E2E_ITEM_TRACKED-001','E2E_ITEM_TRACKED-002']);
  const approved=await client.from('requests').select('id,user_id,status,comments').eq('comments','E2E_REQUEST_STUDENT_APPROVED').maybeSingle();
  const ri=approved.data?await client.from('request_items').select('id,request_id,item_id,quantity_approved,quantity_delivered').eq('request_id',approved.data.id):{data:[],error:null};
  if(items.error||units.error||approved.error||ri.error) fail('loan_dependency_read_failed');
  return {items:items.data??[],units:units.data??[],approvedRequest:approved.data,approvedItems:ri.data??[],profiles:state.profiles.profiles}
}
function loanDefinitions(deps) {
  return [
    {alias:'E2E_LOAN_ACTIVE',scenario:'active',sourceRequest:'E2E_REQUEST_STUDENT_APPROVED',item:'E2E_ITEM_BULK',quantity:1,expected:'active'},
    {alias:'E2E_LOAN_PARTIAL_RETURN',scenario:'partial',item:'E2E_ITEM_BULK',quantity:2,expected:'partial_return'},
    {alias:'E2E_LOAN_FULL_RETURN',scenario:'full',item:'E2E_ITEM_BULK',quantity:1,expected:'returned'},
  ]
}
function classifyLoans(existing,deps) {
  return loanDefinitions(deps).map(x=>{const found=existing.loans.find(l=>l.notes===x.alias); if(found) return {alias:x.alias,status:found.status===x.expected?'ALREADY_EXISTS_MATCHING':'CONFLICT_EXISTING_RECORD'}; if(x.sourceRequest && (!deps.approvedRequest||deps.approvedRequest.status!=='approved')) return {alias:x.alias,status:'BLOCKED_INVALID_REQUEST_STATUS'}; const item=deps.items.find(i=>i.code===x.item&&i.status==='active'&&i.stock_available>=x.quantity); if(!item) return {alias:x.alias,status:'BLOCKED_INSUFFICIENT_STOCK'}; return {alias:x.alias,status:x.scenario==='partial'?'WOULD_CREATE_AND_RETURN_PARTIAL':x.scenario==='full'?'WOULD_CREATE_AND_RETURN_FULL':'WOULD_CREATE'} })
}
async function executeBatchC1({env,state,admin,dependencies}) {
  const staffId=state.profiles.profiles.e2e_lab_staff.id
  const bulk=dependencies.items.find(i=>i.code==='E2E_ITEM_BULK')?.id
  const approvedItem=dependencies.approvedItems[0]
  if(!dependencies.approvedRequest||dependencies.approvedRequest.status!=='approved'||!approvedItem||!bulk) fail('c1_precondition_failed')
  const staff=await authenticatedClient(env,'e2e_lab_staff')
  const result=await staff.rpc('deliver_approved_request_with_units',{p_request_id:dependencies.approvedRequest.id,p_units:[],p_items:[{request_item_id:approvedItem.id,item_id:bulk,quantity:1}],p_delivered_by:staffId,p_notes:'E2E_LOAN_ACTIVE'})
  if(result.error||!result.data) failRpc('deliver_approved_request_with_units','E2E_LOAN_ACTIVE',result.error,result.data)
  const loan=await admin.from('loans').select('id,status,request_id,user_id,delivered_by').eq('id',result.data).maybeSingle()
  const loanItem=await admin.from('loan_items').select('id,quantity,returned_quantity').eq('loan_id',result.data).maybeSingle()
  if(loan.error||loanItem.error||!loan.data||!loanItem.data||loan.data.status!=='active') fail('c1_postcondition_failed')
  await writeState(env.expectedRef,{E2E_LOAN_ACTIVE:{id:result.data,table:'loans',batch:'C',scenario:'C1',loan_id:result.data,loan_item_id:loanItem.data.id,request_id:dependencies.approvedRequest.id,borrower_alias:'e2e_student',operator_alias:'e2e_lab_staff',item_alias:'E2E_ITEM_BULK',quantity:1,returned_quantity:0,loan_status:'active',request_status:'delivered',operations:['deliver_approved_request_with_units'],dependencies:['request:E2E_REQUEST_STUDENT_APPROVED','item:E2E_ITEM_BULK']}})
  console.log('E2E_LOAN_ACTIVE: CREATED')
}

async function executeBatchC2({ env, state, admin, dependencies }) {
  const staffId = state.profiles.profiles.e2e_lab_staff.id
  const studentId = state.profiles.profiles.e2e_student.id
  const bulk = dependencies.items.find((item) => item.code === 'E2E_ITEM_BULK')
  if (!bulk || bulk.status !== 'active' || bulk.stock_available < 2) fail('c2_precondition_failed')

  const staff = await authenticatedClient(env, 'e2e_lab_staff')
  const expectedReturnDate = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  const created = await staff.rpc('create_multi_item_loan_transaction', {
    p_user_id: studentId,
    p_items: [{ item_id: bulk.id, item_unit_id: null, quantity: 2 }],
    p_expected_return_date: expectedReturnDate,
    p_notes: 'E2E_LOAN_PARTIAL_RETURN',
    p_delivered_by: staffId,
  })
  if (created.error || !created.data) failRpc('create_multi_item_loan_transaction', 'E2E_LOAN_PARTIAL_RETURN', created.error, created.data)

  const loan = await admin.from('loans').select('id,status,request_id,user_id,delivered_by').eq('id', created.data).maybeSingle()
  const loanItem = await admin.from('loan_items').select('id,quantity,returned_quantity').eq('loan_id', created.data).maybeSingle()
  if (loan.error || loanItem.error || !loan.data || !loanItem.data || loan.data.status !== 'active' || loanItem.data.quantity !== 2 || loanItem.data.returned_quantity !== 0) fail('c2_loan_postcondition_failed')

  await writeState(env.expectedRef, { E2E_LOAN_PARTIAL_RETURN: {
    id: created.data, table: 'loans', batch: 'C', scenario: 'C2', loan_id: created.data,
    loan_item_id: loanItem.data.id, request_id: null, borrower_alias: 'e2e_student',
    operator_alias: 'e2e_lab_staff', item_alias: 'E2E_ITEM_BULK', quantity: 2,
    returned_quantity: 0, pending_quantity: 2, loan_status: 'active',
    operations: ['create_multi_item_loan_transaction'],
    dependencies: ['profile:e2e_student', 'profile:e2e_lab_staff', 'item:E2E_ITEM_BULK'],
  } })

  const returned = await staff.rpc('register_return_transaction', {
    p_loan_item_id: loanItem.data.id, p_quantity_ok: 1, p_quantity_damaged: 0,
    p_quantity_missing: 0, p_notes: 'E2E partial return', p_received_by: staffId,
  })
  if (returned.error || !returned.data) failRpc('register_return_transaction', 'E2E_LOAN_PARTIAL_RETURN', returned.error, returned.data)

  const finalLoanItem = await admin.from('loan_items').select('id,quantity,returned_quantity').eq('id', loanItem.data.id).maybeSingle()
  const finalLoan = await admin.from('loans').select('id,status').eq('id', created.data).maybeSingle()
  const returnRow = await admin.from('returns').select('id,loan_id').eq('id', returned.data).maybeSingle()
  const returnItem = await admin.from('return_items').select('id,return_id,loan_item_id,quantity_ok,quantity_damaged,quantity_missing').eq('return_id', returned.data).maybeSingle()
  if (finalLoan.error || finalLoanItem.error || returnRow.error || returnItem.error || !finalLoan.data || !finalLoanItem.data || !returnRow.data || !returnItem.data || finalLoan.data.status !== 'partial_return' || finalLoanItem.data.returned_quantity !== 1 || returnItem.data.quantity_ok !== 1) fail('c2_return_postcondition_failed')

  await writeState(env.expectedRef, { E2E_LOAN_PARTIAL_RETURN: {
    id: created.data, table: 'loans', batch: 'C', scenario: 'C2', loan_id: created.data,
    loan_item_id: loanItem.data.id, return_id: returned.data, return_item_id: returnItem.data.id,
    request_id: null, borrower_alias: 'e2e_student', operator_alias: 'e2e_lab_staff',
    item_alias: 'E2E_ITEM_BULK', quantity: 2, returned_quantity: 1, pending_quantity: 1,
    loan_status: 'partial_return', operations: ['create_multi_item_loan_transaction', 'register_return_transaction'],
    dependencies: ['profile:e2e_student', 'profile:e2e_lab_staff', 'item:E2E_ITEM_BULK'],
  } })
  console.log('E2E_LOAN_PARTIAL_RETURN: CREATED')
}

async function executeBatchC3({ env, state, admin, dependencies }) {
  const staffId = state.profiles.profiles.e2e_lab_staff.id
  const studentId = state.profiles.profiles.e2e_student.id
  const bulk = dependencies.items.find((item) => item.code === 'E2E_ITEM_BULK')
  if (!bulk || bulk.status !== 'active' || bulk.stock_available < 1) fail('c3_precondition_failed')

  const staff = await authenticatedClient(env, 'e2e_lab_staff')
  const expectedReturnDate = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  const created = await staff.rpc('create_multi_item_loan_transaction', {
    p_user_id: studentId,
    p_items: [{ item_id: bulk.id, item_unit_id: null, quantity: 1 }],
    p_expected_return_date: expectedReturnDate,
    p_notes: 'E2E_LOAN_FULL_RETURN',
    p_delivered_by: staffId,
  })
  if (created.error || !created.data) failRpc('create_multi_item_loan_transaction', 'E2E_LOAN_FULL_RETURN', created.error, created.data)

  const loan = await admin.from('loans').select('id,status,request_id,user_id,delivered_by').eq('id', created.data).maybeSingle()
  const loanItem = await admin.from('loan_items').select('id,quantity,returned_quantity').eq('loan_id', created.data).maybeSingle()
  if (loan.error || loanItem.error || !loan.data || !loanItem.data || loan.data.status !== 'active' || loanItem.data.quantity !== 1 || loanItem.data.returned_quantity !== 0) fail('c3_loan_postcondition_failed')

  await writeState(env.expectedRef, { E2E_LOAN_FULL_RETURN: {
    id: created.data, table: 'loans', batch: 'C', scenario: 'C3', loan_id: created.data,
    loan_item_id: loanItem.data.id, request_id: null, borrower_alias: 'e2e_student',
    operator_alias: 'e2e_lab_staff', item_alias: 'E2E_ITEM_BULK', quantity: 1,
    returned_quantity: 0, pending_quantity: 1, loan_status: 'active',
    operations: ['create_multi_item_loan_transaction'],
    dependencies: ['profile:e2e_student', 'profile:e2e_lab_staff', 'item:E2E_ITEM_BULK'],
  } })

  const returned = await staff.rpc('register_full_return_transaction', {
    p_loan_id: created.data,
    p_notes: 'E2E full return',
    p_received_by: staffId,
  })
  if (returned.error || !returned.data) failRpc('register_full_return_transaction', 'E2E_LOAN_FULL_RETURN', returned.error, returned.data)

  const finalLoanItem = await admin.from('loan_items').select('id,quantity,returned_quantity,missing_quantity').eq('id', loanItem.data.id).maybeSingle()
  const finalLoan = await admin.from('loans').select('id,status').eq('id', created.data).maybeSingle()
  const returnRow = await admin.from('returns').select('id,loan_id').eq('id', returned.data).maybeSingle()
  const returnItem = await admin.from('return_items').select('id,return_id,loan_item_id,quantity_ok,quantity_damaged,quantity_missing').eq('return_id', returned.data).maybeSingle()
  if (finalLoan.error || finalLoanItem.error || returnRow.error || returnItem.error || !finalLoan.data || !finalLoanItem.data || !returnRow.data || !returnItem.data || finalLoan.data.status !== 'returned' || finalLoanItem.data.returned_quantity !== 1 || returnItem.data.quantity_ok !== 1) fail('c3_return_postcondition_failed')

  await writeState(env.expectedRef, { E2E_LOAN_FULL_RETURN: {
    id: created.data, table: 'loans', batch: 'C', scenario: 'C3', loan_id: created.data,
    loan_item_id: loanItem.data.id, return_id: returned.data, return_item_id: returnItem.data.id,
    request_id: null, borrower_alias: 'e2e_student', operator_alias: 'e2e_lab_staff',
    item_alias: 'E2E_ITEM_BULK', quantity: 1, returned_quantity: 1, pending_quantity: 0,
    loan_status: 'returned', operations: ['create_multi_item_loan_transaction', 'register_full_return_transaction'],
    dependencies: ['profile:e2e_student', 'profile:e2e_lab_staff', 'item:E2E_ITEM_BULK'],
  } })
  console.log('E2E_LOAN_FULL_RETURN: CREATED')
}

async function executeBatchD1({ env, state, admin, dependencies }) {
  const staff = await authenticatedClient(env, 'e2e_lab_staff')
  const result = await staff.rpc('register_maintenance_record_transaction', {
    p_item_id: dependencies.item.id,
    p_item_unit_id: dependencies.unit.id,
    p_activity: 'E2E maintenance inspection',
    p_responsible: 'E2E Laboratory Staff',
    p_maintenance_date: new Date().toISOString().slice(0, 10),
    p_observations: 'E2E_MAINTENANCE_ACTIVE_01',
    p_maintenance_type: 'preventive',
    p_mark_unit_unavailable: true,
  })
  if (result.error || !result.data) failRpc('register_maintenance_record_transaction', 'E2E_MAINTENANCE_ACTIVE_01', result.error, result.data)
  const record = await admin.from('maintenance_records').select('id,item_unit_id,maintenance_type,observations').eq('id', result.data).maybeSingle()
  const unit = await admin.from('item_units').select('id,condition,availability_status').eq('id', dependencies.unit.id).maybeSingle()
  if (record.error || unit.error || !record.data || !unit.data || unit.data.condition !== 'maintenance' || unit.data.availability_status !== 'unavailable') fail('d1_postcondition_failed')
  await writeState(env.expectedRef, { E2E_MAINTENANCE_ACTIVE_01: {
    id: result.data, table: 'maintenance_records', batch: 'D', scenario: 'D1', maintenance_id: result.data,
    item_id: dependencies.item.id, item_unit_id: dependencies.unit.id, operator_alias: 'e2e_lab_staff',
    maintenance_status: 'active', unit_condition: 'maintenance', unit_availability: 'unavailable',
    maintenance_type: 'preventive', operations: ['register_maintenance_record_transaction'],
    dependencies: ['item:E2E_ITEM_TRACKED', 'unit:E2E_ITEM_TRACKED-001'],
  } })
  console.log('E2E_MAINTENANCE_ACTIVE_01: CREATED')
}

async function executeBatchC({env,state,admin,dependencies}) {
  const staffId=state.profiles.profiles.e2e_lab_staff.id; const studentId=state.profiles.profiles.e2e_student.id; const bulk=dependencies.items.find(i=>i.code==='E2E_ITEM_BULK').id; const records={}; const staff=await authenticatedClient(env,'e2e_lab_staff');
  const approvedItem=dependencies.approvedItems[0]; const c1=await staff.rpc('deliver_approved_request_with_units',{p_request_id:dependencies.approvedRequest.id,p_units:[],p_items:[{request_item_id:approvedItem.id,item_id:bulk,quantity:1}],p_delivered_by:staffId,p_notes:'E2E_LOAN_ACTIVE'}); if(c1.error||!c1.data) failRpc('deliver_approved_request_with_units','E2E_LOAN_ACTIVE',c1.error,c1.data); records.E2E_LOAN_ACTIVE={id:c1.data,table:'loans',batch:'C',request_id:dependencies.approvedRequest.id,borrower_alias:'e2e_student',operator_alias:'e2e_lab_staff',item_alias:'E2E_ITEM_BULK',quantity:1,loan_status:'active',operations:['deliver_approved_request_with_units']}; await writeState(env.expectedRef,records);
  for(const x of [{alias:'E2E_LOAN_PARTIAL_RETURN',qty:2,ret:'partial'},{alias:'E2E_LOAN_FULL_RETURN',qty:1,ret:'full'}]) { const created=await staff.rpc('create_multi_item_loan_transaction',{p_user_id:studentId,p_items:[{item_id:bulk,item_unit_id:null,quantity:x.qty}],p_expected_return_date:new Date(Date.now()+14*86400000).toISOString().slice(0,10),p_notes:x.alias,p_delivered_by:staffId}); if(created.error||!created.data) fail('loan_create_failed_'+x.alias); const q=await admin.from('loan_items').select('id').eq('loan_id',created.data).maybeSingle(); if(q.error||!q.data) fail('loan_item_missing_'+x.alias); let ret; if(x.ret==='partial') ret=await staff.rpc('register_return_transaction',{p_loan_item_id:q.data.id,p_quantity_ok:1,p_quantity_damaged:0,p_quantity_missing:0,p_notes:'E2E partial return',p_received_by:staffId}); else ret=await staff.rpc('register_full_return_transaction',{p_loan_id:created.data,p_notes:'E2E full return',p_received_by:staffId}); if(ret.error||!ret.data) fail('return_failed_'+x.alias); records[x.alias]={id:created.data,table:'loans',batch:'C',loan_id:created.data,loan_item_id:q.data.id,borrower_alias:'e2e_student',operator_alias:'e2e_lab_staff',item_alias:'E2E_ITEM_BULK',quantity:x.qty,returned_quantity:x.ret==='partial'?1:x.qty,loan_status:x.ret==='partial'?'partial_return':'returned',return_id:ret.data,operations:['create_multi_item_loan_transaction',x.ret==='partial'?'register_return_transaction':'register_full_return_transaction']}; await writeState(env.expectedRef,records) }
}

function failRpc(operation,alias,error,data) { const category=classifyRpcError(error,data); console.error('ERROR: '+category+' operation='+operation+' alias='+alias+' failure_stage=rpc'); process.exit(1) }
function classifyRpcError(error,data) { if(!error && data==null) return 'unexpected_return_shape'; const text=String(error?.message||'').toLowerCase(); if(error?.status===401||error?.status===403||text.includes('permiso')||text.includes('autentic')) return 'permission_denied'; if(text.includes('approved')||text.includes('aprob')) return 'request_not_approved'; if(text.includes('responsable')||text.includes('autenticado')) return 'permission_denied'; if(text.includes('stock')) return 'insufficient_stock'; if(text.includes('unidad')) return 'unit_assignment_required'; if(text.includes('network')||text.includes('fetch')) return 'network_failure'; if(text.includes('timeout')) return 'timeout'; if(error?.code?.startsWith('23')) return 'constraint_violation'; return error?'business_precondition_failed':'unexpected_return_shape' }

function itemDefinitions() {
  return [
    { alias: 'E2E_ITEM_BULK', code: 'E2E_ITEM_BULK', track: false, rpcArgs: { p_code: 'E2E_ITEM_BULK', p_name: 'E2E Bulk Item', p_description: 'E2E bulk inventory', p_category: 'E2E', p_item_type: 'consumable', p_track_individual: false, p_stock_total: 10, p_stock_available: 10, p_status: 'active', p_location: 'E2E Lab' } },
    { alias: 'E2E_ITEM_TRACKED', code: 'E2E_ITEM_TRACKED', track: true, serials: ['E2E_ITEM_TRACKED-001', 'E2E_ITEM_TRACKED-002'], rpcArgs: { p_code: 'E2E_ITEM_TRACKED', p_name: 'E2E Tracked Item', p_description: 'E2E tracked equipment', p_category: 'E2E', p_item_type: 'equipment', p_track_individual: true, p_stock_total: 2, p_stock_available: 2, p_status: 'active', p_location: 'E2E Lab' } },
  ]
}
function loadEnv() { const keys=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','E2E_EXPECTED_PROJECT_REF','E2E_LAB_STAFF_EMAIL','E2E_LAB_STAFF_PASSWORD','E2E_STUDENT_EMAIL','E2E_STUDENT_PASSWORD','E2E_TEACHER_EMAIL','E2E_TEACHER_PASSWORD']; const v=Object.fromEntries(keys.map((k)=>[k,(process.env[k]??'').trim()])); return {url:v.NEXT_PUBLIC_SUPABASE_URL,anonKey:v.NEXT_PUBLIC_SUPABASE_ANON_KEY,serviceKey:v.SUPABASE_SERVICE_ROLE_KEY,expectedRef:v.E2E_EXPECTED_PROJECT_REF,labStaffEmail:v.E2E_LAB_STAFF_EMAIL,labStaffPassword:v.E2E_LAB_STAFF_PASSWORD,studentEmail:v.E2E_STUDENT_EMAIL,studentPassword:v.E2E_STUDENT_PASSWORD,teacherEmail:v.E2E_TEACHER_EMAIL,teacherPassword:v.E2E_TEACHER_PASSWORD} }
function loadState() { try { return { auth: JSON.parse(fsSync.readFileSync('.e2e-state/auth-users.json','utf8')), profiles: JSON.parse(fsSync.readFileSync('.e2e-state/profiles.json','utf8')), data: JSON.parse(fsSync.readFileSync('.e2e-state/test-data.json','utf8')) } } catch { fail('state_unavailable') } }
function validateContext(env, state) { if (Object.values(env).some((v)=>!v)) fail('missing_configuration'); let u; try { u=new URL(env.url) } catch { fail('invalid_url') }; if (u.protocol!=='https:'||!u.hostname.endsWith('.supabase.co')||u.hostname.split('.')[0]!==env.expectedRef) fail('project_ref_mismatch'); const linked=fsSync.readFileSync('tests/supabase-e2e-db/supabase/.temp/project-ref','utf8').trim(); if (linked!==env.expectedRef||state.auth.projectRef!==env.expectedRef||state.profiles.projectRef!==env.expectedRef||state.data.projectRef!==env.expectedRef) fail('state_project_ref_mismatch'); const aliases=['e2e_admin','e2e_lab_staff','e2e_teacher','e2e_student']; if (Object.keys(state.auth.users).length!==4||Object.keys(state.profiles.profiles).length!==4||!aliases.every((a)=>state.auth.users[a]&&state.profiles.profiles[a])) fail('state_alias_mismatch'); if (!state.data.records?.E2E_ITEM_BULK || !state.data.records?.E2E_ITEM_TRACKED) fail('batch_a_state_missing'); if (/(password|secret|token|session|refresh|jwt|key)/i.test(JSON.stringify(state))) fail('state_contains_secret') }
async function verifyAuthAndProfiles(client,state) { const {data,error}=await client.auth.admin.listUsers({page:1,perPage:1000}); if(error) fail('auth_list_failed'); for(const alias of Object.keys(state.auth.users)){const u=(data.users||[]).find((x)=>x.id===state.auth.users[alias].id); if(!u||u.user_metadata?.e2e_test!==true||u.user_metadata?.e2e_alias!==alias||!u.email_confirmed_at) fail('auth_mismatch_'+alias)} const ids=Object.values(state.profiles.profiles).map((x)=>x.id); const q=await client.from('profiles').select('id,role').in('id',ids); if(q.error||q.data?.length!==4||q.data.some((x)=>!ids.includes(x.id))) fail('profiles_mismatch') }
async function readExisting(client) { const items=await client.from('items').select('id,code,name,item_type,track_individual,stock_total,stock_available,status').in('code',['E2E_ITEM_BULK','E2E_ITEM_TRACKED']); if(items.error) fail('items_read_failed'); const units=await readUnits(client,['E2E_ITEM_TRACKED-001','E2E_ITEM_TRACKED-002']); return {items:items.data??[],units} }
async function readUnits(client,serials) { const q=await client.from('item_units').select('id,item_id,serial_code,condition,availability_status').in('serial_code',serials); if(q.error) fail('units_read_failed'); return q.data??[] }
function classify(existing) { const out=[]; for(const x of itemDefinitions()){const row=existing.items.find((r)=>r.code===x.code); const match=row&&rmatch(row,x); out.push({alias:x.alias,status:row?(match?'ALREADY_EXISTS_MATCHING':'CONFLICT_EXISTING_RECORD'):'WOULD_CREATE'}); if(x.track){for(const serial of x.serials){const unit=existing.units.find((u)=>u.serial_code===serial); out.push({alias:serial,status:unit?(unit.condition==='good'&&unit.availability_status==='available'?'ALREADY_EXISTS_MATCHING':'CONFLICT_EXISTING_RECORD'):'WOULD_CREATE'})}}} return out }
function rmatch(row,x) { return row.name===x.rpcArgs.p_name&&row.item_type===x.rpcArgs.p_item_type&&row.track_individual===x.rpcArgs.p_track_individual&&row.stock_total===x.rpcArgs.p_stock_total&&row.stock_available===x.rpcArgs.p_stock_available&&row.status===x.rpcArgs.p_status }
async function writeState(ref,records) { const target='.e2e-state/test-data.json'; const tmp=target+'.tmp'; const current=JSON.parse(await fs.readFile(target,'utf8')); await fs.mkdir('.e2e-state',{recursive:true,mode:0o700}); await fs.writeFile(tmp,JSON.stringify({...current,records:{...current.records,...records}},null,2)+'\n',{mode:0o600}); await fs.rename(tmp,target) }
function fail(code) { console.error('ERROR: '+code); process.exit(1) }


async function readExistingMaintenance(client) {
  const [maintenance, movements, units, items, loans, loanItems] = await Promise.all([
    client.from('maintenance_records').select('id,item_id,item_unit_id,activity,responsible,maintenance_date,observations,maintenance_type,created_by'),
    client.from('inventory_movements').select('id,item_id,movement_type,quantity,reference_table,reference_id'),
    client.from('item_units').select('id,item_id,serial_code,condition,availability_status').in('serial_code',['E2E_ITEM_TRACKED-001','E2E_ITEM_TRACKED-002']),
    client.from('items').select('id,code,item_type,status,stock_total,stock_available').eq('code','E2E_ITEM_TRACKED'),
    client.from('loans').select('id,status,notes'),
    client.from('loan_items').select('id,loan_id,item_unit_id,quantity,returned_quantity,missing_quantity'),
  ])
  if ([maintenance,movements,units,items,loans,loanItems].some((query) => query.error)) fail('maintenance_read_failed')
  return { maintenance: maintenance.data ?? [], movements: movements.data ?? [], units: units.data ?? [], items: items.data ?? [], loans: loans.data ?? [], loanItems: loanItems.data ?? [] }
}

async function readMaintenanceDependencies(client, state) {
  const existing = await readExistingMaintenance(client)
  const unit = existing.units.find((row) => row.serial_code === 'E2E_ITEM_TRACKED-001')
  const otherUnit = existing.units.find((row) => row.serial_code === 'E2E_ITEM_TRACKED-002')
  const item = existing.items.find((row) => row.code === 'E2E_ITEM_TRACKED')
  const profileIds = Object.values(state.profiles.profiles).map((record) => record.id)
  const profileQuery = await client.from('profiles').select('id,role,is_active').in('id', profileIds)
  if (profileQuery.error) fail('maintenance_profile_read_failed')
  const profiles = Object.fromEntries(Object.entries(state.profiles.profiles).map(([alias, record]) => [alias, { id: record.id, ...(profileQuery.data ?? []).find((row) => row.id === record.id) }]))
  if (!unit || !otherUnit || !item) fail('maintenance_dependency_missing')
  return { ...existing, unit, otherUnit, item, profiles }
}

function classifyMaintenance(existing, deps) {
  const found = existing.maintenance.find((row) => row.item_unit_id === deps.unit.id && row.observations === 'E2E_MAINTENANCE_ACTIVE_01')
  if (found) return [{ alias: 'E2E_MAINTENANCE_ACTIVE_01', status: deps.unit.condition === 'maintenance' && deps.unit.availability_status === 'unavailable' ? 'ALREADY_EXISTS_MATCHING' : 'CONFLICT_EXISTING_RECORD' }]
  if (deps.item.item_type !== 'equipment' || deps.item.status !== 'active') return [{ alias: 'E2E_MAINTENANCE_ACTIVE_01', status: 'BLOCKED_MISSING_DEPENDENCY' }]
  if (deps.unit.condition !== 'good' || deps.unit.availability_status !== 'available') return [{ alias: 'E2E_MAINTENANCE_ACTIVE_01', status: 'BLOCKED_UNIT_NOT_AVAILABLE' }]
  if (deps.otherUnit.condition !== 'good' || deps.otherUnit.availability_status !== 'available') return [{ alias: 'E2E_MAINTENANCE_ACTIVE_01', status: 'BLOCKED_INVALID_TRANSITION' }]
  if (deps.loanItems.some((row) => row.item_unit_id === deps.unit.id && ['active','partial_return','overdue'].includes(deps.loans.find((loan) => loan.id === row.loan_id)?.status))) return [{ alias: 'E2E_MAINTENANCE_ACTIVE_01', status: 'BLOCKED_UNIT_ON_ACTIVE_LOAN' }]
  if (deps.profiles.e2e_lab_staff?.role !== 'lab_staff' || deps.profiles.e2e_lab_staff?.is_active !== true) return [{ alias: 'E2E_MAINTENANCE_ACTIVE_01', status: 'BLOCKED_INVALID_ACTOR' }]
  return [{ alias: 'E2E_MAINTENANCE_ACTIVE_01', status: 'WOULD_CREATE_AND_UPDATE_UNIT' }]
}

async function readExistingRequests(client) {
  const queries = await Promise.all([
    client.from('requests').select('id,user_id,status,purpose,comments'),
    client.from('request_items').select('id,request_id,item_id,quantity_requested'),
    client.from('request_groups').select('id,request_id,group_name,leader_student_id'),
    client.from('request_group_items').select('id,request_group_id,item_id,quantity'),
  ])
  if (queries.some((query) => query.error)) fail('requests_read_failed')
  return { requests: queries[0].data ?? [], requestItems: queries[1].data ?? [], requestGroups: queries[2].data ?? [], requestGroupItems: queries[3].data ?? [] }
}

async function readRequestDependencies(client, state) {
  const items = await client.from('items').select('id,code,status,stock_available').in('code', ['E2E_ITEM_BULK', 'E2E_ITEM_TRACKED'])
  const profileIds = Object.values(state.profiles.profiles).map((record) => record.id)
  const profiles = await client.from('profiles').select('id,role,is_active').in('id', profileIds)
  if (items.error || profiles.error) fail('request_dependency_read_failed')
  return {
    items: items.data ?? [],
    profiles: Object.fromEntries(Object.entries(state.profiles.profiles).map(([alias, record]) => [alias, { id: record.id, ...(profiles.data ?? []).find((row) => row.id === record.id) }])),
  }
}

function requestDefinitions(deps) {
  const bulkId = deps.items.find((item) => item.code === 'E2E_ITEM_BULK')?.id
  const trackedId = deps.items.find((item) => item.code === 'E2E_ITEM_TRACKED')?.id
  const studentId = deps.profiles.e2e_student?.id
  const futureDate = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  const individual = (alias, purpose, transition) => ({
    alias,
    actor: 'e2e_student',
    item: 'E2E_ITEM_BULK',
    create: { p_purpose: purpose, p_comments: alias, p_scheduled_return_date: futureDate, p_items: [{ item_id: bulkId, quantity_requested: 1 }], p_groups: [] },
    transition,
  })
  return [
    individual('E2E_REQUEST_STUDENT_PENDING', 'E2E pending request', null),
    individual('E2E_REQUEST_STUDENT_REJECTED', 'E2E rejected request', { status: 'rejected' }),
    individual('E2E_REQUEST_STUDENT_APPROVED', 'E2E approved request', { status: 'approved' }),
    { alias: 'E2E_REQUEST_TEACHER_GROUP', actor: 'e2e_teacher', item: 'E2E_ITEM_TRACKED', create: { p_purpose: 'E2E group request', p_comments: 'E2E_REQUEST_TEACHER_GROUP', p_scheduled_return_date: futureDate, p_items: [], p_groups: [{ group_name: 'E2E Group 01', leader_student_id: studentId, items: [{ item_id: trackedId, quantity: 1 }] }] }, transition: null },
  ]
}

function classifyRequests(existing, deps) {
  return requestDefinitions(deps).map((scenario) => {
    const found = existing.requests.find((row) => row.comments === scenario.alias)
    if (found) return { alias: scenario.alias, status: found.status === (scenario.transition?.status ?? 'pending') ? 'ALREADY_EXISTS_MATCHING' : 'CONFLICT_EXISTING_RECORD' }
    const item = deps.items.find((row) => row.code === scenario.item && row.status === 'active' && row.stock_available >= 1)
    const profile = deps.profiles[scenario.actor]
    if (!item) return { alias: scenario.alias, status: 'BLOCKED_INSUFFICIENT_STOCK' }
    if (!profile?.is_active || !['teacher', 'student'].includes(profile.role)) return { alias: scenario.alias, status: 'BLOCKED_INVALID_ACTOR' }
    if (scenario.create.p_groups.length && deps.profiles.e2e_student?.role !== 'student') return { alias: scenario.alias, status: 'BLOCKED_INVALID_ACTOR' }
    return { alias: scenario.alias, status: scenario.transition ? 'WOULD_CREATE_AND_TRANSITION' : 'WOULD_CREATE' }
  })
}
