#!/usr/bin/env node
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import { runBaselineRead } from './lib/baseline-read-observer.mjs'
import { createBaselineExceptionEnvelope } from './lib/baseline-exception-envelope.mjs'
import { startPassiveObserver } from './lib/l1-passive-observer.mjs'

export async function runBaselineCore(options = {}) {
const progress={stage:'PRE_CLIENT_SETUP',currentReadOrdinal:'NOT_STARTED',currentReadPurposeClass:'NOT_STARTED',readsStarted:0,readsCompleted:0,lastCompletedReadOrdinal:'NONE',rawTransportClass:'UNKNOWN',hostClass:'HOSTNAME_NOT_AVAILABLE',statusClass:'UNKNOWN'}
try{return await runBaselineCoreUnsafe({...options,progress})}catch(error){const failure=createBaselineExceptionEnvelope(error,progress);return{ok:false,final:'FAIL',failure,readExecutionCount:18,readEvents:[],remoteWrites:0,businessRpcExecutions:0,results:[],warnings:[],counts:{}}}
}

async function runBaselineCoreUnsafe({ env: injectedEnv, emit = false, jsonMode = false, progress } = {}) {
const env=injectedEnv ?? loadEnv()
const files=['.e2e-state/auth-users.json','.e2e-state/profiles.json','.e2e-state/test-data.json']
const state={auth:readJson(files[0]),profiles:readJson(files[1]),data:readJson(files[2])}
const results=[]
const warnings=[]
const ids={}
const section=(name,ok,detail='')=>results.push({name,status:ok?'PASS':'FAIL',detail:detail||undefined})
const expectedAliases=['E2E_ITEM_BULK','E2E_ITEM_TRACKED','E2E_UNIT_TRACKED_01','E2E_UNIT_TRACKED_02','E2E_REQUEST_STUDENT_PENDING','E2E_REQUEST_STUDENT_REJECTED','E2E_REQUEST_STUDENT_APPROVED','E2E_REQUEST_TEACHER_GROUP','E2E_LOAN_ACTIVE','E2E_LOAN_PARTIAL_RETURN','E2E_LOAN_FULL_RETURN','E2E_MAINTENANCE_ACTIVE_01']
const admin=createClient(env.url,env.serviceKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
progress.stage='TARGET_SETUP'
let currentReadOrdinal=0
const readEvents=[]
const failures=[]
progress.stage='OBSERVER_START'
const passiveObserver=startPassiveObserver(() => currentReadOrdinal, new URL(env.url).hostname)
const read=async (query, metadata) => {
  currentReadOrdinal=metadata.ordinal
  progress.stage='READ_PREPARATION'
  progress.currentReadOrdinal=metadata.ordinal
  progress.currentReadPurposeClass=metadata.readClass
  progress.readsStarted+=1
  const result=await runBaselineRead({ operation: () => query, ordinal: metadata.ordinal, readClass: metadata.readClass, observer: passiveObserver, onEvent: (event) => readEvents.push(event) })
  if (!result.ok) {
    failures.push(result.failure)
    progress.rawTransportClass=result.failure.rawTransportClass
    progress.hostClass=result.failure.hostClass
    progress.statusClass=result.failure.statusClass
  } else {
    progress.statusClass=result.responseClass?.errorStatusClass ?? 'NO_FAILURE'
  }
  progress.readsCompleted+=1
  progress.lastCompletedReadOrdinal=metadata.ordinal
  progress.stage='READ_COMPLETE'
  return result
}

const contextOk=validateContext(env,state)
section('STATE_FILES',contextOk && validateStateFiles(env,state,files,expectedAliases))
const authResult=await validateAuth(admin,state,read)
section('AUTH',authResult.ok,authResult.detail)
const profileResult=await validateProfiles(admin,state,authResult.users,read)
section('PROFILES',profileResult.ok,profileResult.detail)
ids.auth=authResult.users
ids.profiles=profileResult.rows

const items=await read(admin.from('items').select('id,code,name,item_type,track_individual,stock_total,stock_available,status').in('code',['E2E_ITEM_BULK','E2E_ITEM_TRACKED']),{ordinal:3,readClass:'BASELINE_ITEMS'})
const itemsOk=items.ok && items.rows.length===2 && checkItems(items.rows)
ids.items=Object.fromEntries(items.rows.map(r=>[r.code,r]))
section('ITEMS',itemsOk,items.ok?'':items.error)
const units=await read(admin.from('item_units').select('id,item_id,serial_code,condition,availability_status').in('serial_code',['E2E_ITEM_TRACKED-001','E2E_ITEM_TRACKED-002']),{ordinal:4,readClass:'BASELINE_ITEM_UNITS'})
ids.units=Object.fromEntries(units.rows.map(r=>[r.serial_code,r]))
const unitsOk=units.ok && units.rows.length===2 && checkUnits(units.rows,ids.items)
section('ITEM_UNITS',unitsOk,units.ok?'':units.error)

const requests=await read(admin.from('requests').select('id,user_id,status,comments,approved_by,rejection_reason').in('comments',['E2E_REQUEST_STUDENT_PENDING','E2E_REQUEST_STUDENT_REJECTED','E2E_REQUEST_STUDENT_APPROVED','E2E_REQUEST_TEACHER_GROUP']),{ordinal:5,readClass:'BASELINE_REQUESTS'})
ids.requests=Object.fromEntries(requests.rows.map(r=>[r.comments,r]))
const requestsOk=requests.ok && requests.rows.length===4 && checkRequests(requests.rows,ids.auth,ids.profiles)
section('REQUESTS',requestsOk,requests.ok?'':requests.error)
const requestItems=await read(admin.from('request_items').select('id,request_id,item_id,quantity_requested,quantity_approved,quantity_delivered,quantity_returned,quantity_damaged').in('request_id',requests.rows.map(r=>r.id)),{ordinal:6,readClass:'BASELINE_REQUEST_ITEMS'})
const requestItemsOk=requestItems.ok && requestItems.rows.length===4 && requestItems.rows.every(r=>ids.requestsById?.[r.request_id]||requests.rows.some(q=>q.id===r.request_id)) && requestItems.rows.every(r=>r.item_id===ids.items.E2E_ITEM_BULK?.id||r.item_id===ids.items.E2E_ITEM_TRACKED?.id)
section('REQUEST_ITEMS',requestItemsOk,requestItems.ok?'':requestItems.error)
const groups=await read(admin.from('request_groups').select('id,request_id,group_name,leader_student_id').in('request_id',requests.rows.map(r=>r.id)),{ordinal:7,readClass:'BASELINE_REQUEST_GROUPS'})
ids.groups=groups.rows
const groupsOk=groups.ok && groups.rows.length===1 && groups.rows[0].request_id===ids.requests.E2E_REQUEST_TEACHER_GROUP?.id && groups.rows[0].leader_student_id===ids.profiles.e2e_student
section('REQUEST_GROUPS',groupsOk,groups.ok?'':groups.error)
const groupItems=await read(admin.from('request_group_items').select('id,request_group_id,item_id,quantity').in('request_group_id',groups.rows.map(r=>r.id)),{ordinal:8,readClass:'BASELINE_REQUEST_GROUP_ITEMS'})
const groupItemsOk=groupItems.ok && groupItems.rows.length===1 && groups.rows[0] && groupItems.rows[0]?.request_group_id===groups.rows[0].id && groupItems.rows[0]?.item_id===ids.items.E2E_ITEM_TRACKED?.id && groupItems.rows[0]?.quantity===1
section('REQUEST_GROUP_ITEMS',groupItemsOk,groupItems.ok?'':groupItems.error)

const loans=await read(admin.from('loans').select('id,notes,status,request_id,user_id,delivered_by').in('notes',['E2E_LOAN_ACTIVE','E2E_LOAN_PARTIAL_RETURN','E2E_LOAN_FULL_RETURN']),{ordinal:9,readClass:'BASELINE_LOANS'})
ids.loans=Object.fromEntries(loans.rows.map(r=>[r.notes,r]))
const loansOk=loans.ok && loans.rows.length===3 && checkLoans(loans.rows,ids)
section('LOANS',loansOk,loans.ok?'':loans.error)
const loanItems=await read(admin.from('loan_items').select('id,loan_id,item_id,item_unit_id,quantity,returned_quantity,missing_quantity').in('loan_id',loans.rows.map(r=>r.id)),{ordinal:10,readClass:'BASELINE_LOAN_ITEMS'})
const loanItemsOk=loanItems.ok && loanItems.rows.length===3 && checkLoanItems(loanItems.rows,ids)
section('LOAN_ITEMS',loanItemsOk,loanItems.ok?'':loanItems.error)
const returns=await read(admin.from('returns').select('id,loan_id,received_by').in('loan_id',loans.rows.map(r=>r.id)),{ordinal:11,readClass:'BASELINE_RETURNS'})
ids.returns=returns.rows
const returnsOk=returns.ok && returns.rows.length===2 && returns.rows.every(r=>['E2E_LOAN_PARTIAL_RETURN','E2E_LOAN_FULL_RETURN'].some(a=>ids.loans[a]?.id===r.loan_id)&&r.received_by===ids.profiles.e2e_lab_staff)
section('RETURNS',returnsOk,returns.ok?'':returns.error)
const returnItems=await read(admin.from('return_items').select('id,return_id,loan_item_id,quantity_ok,quantity_damaged,quantity_missing').in('return_id',returns.rows.map(r=>r.id)),{ordinal:12,readClass:'BASELINE_RETURN_ITEMS'})
const returnItemsOk=returnItems.ok && returnItems.rows.length===2 && returnItems.rows.every(r=>r.quantity_ok===1&&r.quantity_damaged===0&&r.quantity_missing===0&&returns.rows.some(q=>q.id===r.return_id)&&loanItems.rows.some(q=>q.id===r.loan_item_id))
section('RETURN_ITEMS',returnItemsOk,returnItems.ok?'':returnItems.error)

const maintenance=await read(admin.from('maintenance_records').select('id,item_id,item_unit_id,activity,responsible,maintenance_date,observations,maintenance_type,created_by'),{ordinal:13,readClass:'BASELINE_MAINTENANCE'})
ids.maintenance=maintenance.rows
const maintenanceOk=maintenance.ok && maintenance.rows.length===1 && checkMaintenance(maintenance.rows[0],ids)
section('MAINTENANCE',maintenanceOk,maintenance.ok?'':maintenance.error)
const movements=await read(admin.from('inventory_movements').select('id,item_id,movement_type,quantity,reference_table,reference_id,created_by'),{ordinal:14,readClass:'BASELINE_INVENTORY_MOVEMENTS'})
const movementsOk=movements.ok && movements.rows.length===6 && checkMovements(movements.rows,ids,loans.rows,returns.rows)
section('INVENTORY_MOVEMENTS',movementsOk,movements.ok?'':movements.error)
const staging=await validateStaging(admin,read)
section('STAGING',staging.ok,staging.detail)

const relationshipsOk=relationsOk({items:items.rows,units:units.rows,requests:requests.rows,requestItems:requestItems.rows,groups,groupItems,loans:loans.rows,loanItems:loanItems.rows,returns,returnItems,maintenance:maintenance.rows,movements:movements.rows,ids})
section('RELATIONSHIPS',relationshipsOk)
const quantitativeOk=quantitativeOkFn({items:items.rows,units:units.rows,loans:loans.rows,loanItems:loanItems.rows,ids})
section('QUANTITATIVE_INVARIANTS',quantitativeOk)
const security=securityChecks(state,files)
section('SECURITY',security.ok,security.detail)
const audit=await read(admin.from('audit_logs').select('id'),{ordinal:18,readClass:'BASELINE_AUDIT_LOGS'})
if(audit.ok) warnings.push('audit_logs rows observed: '+audit.rows.length)
else warnings.push('audit_logs read unavailable; not a baseline blocking criterion')

const failed=results.filter(r=>r.status==='FAIL').length
progress.stage='OBSERVER_STOP'
passiveObserver?.stop()
progress.stage='STRUCTURED_RESULT_BUILD'
const firstFailure=failures[0]??(failed?{ordinal:'UNKNOWN',readClass:'BASELINE_INVARIANTS',resultClass:'BUSINESS_INVARIANT_FAILURE',dataClass:'UNKNOWN',statusClass:'NO_FAILURE',rawTransportClass:'NO_FAILURE',hostClass:'NO_FAILURE',invariantClass:'BUSINESS_INVARIANT_FAILURE'}:null)
const output={results,warnings,final:failed===0?'PASS':'FAIL',failure:firstFailure,readExecutionCount:18,readEvents,remoteWrites:0,businessRpcExecutions:0,counts:{auth:Object.keys(authResult.users).length,profiles:profileResult.rows.length,items:items.rows.length,units:units.rows.length,requests:requests.rows.length,request_items:requestItems.rows.length,request_groups:groups.rows.length,request_group_items:groupItems.rows.length,loans:loans.rows.length,loan_items:loanItems.rows.length,returns:returns.rows.length,return_items:returnItems.rows.length,maintenance:maintenance.rows.length,movements:movements.rows.length}}
if(emit) {
  if(jsonMode) console.log(JSON.stringify(output,null,2))
  else { for(const r of results) console.log(r.name+': '+r.status); for(const w of warnings) console.log('WARNING: '+w); console.log('FINAL_RESULT: '+output.final) }
}
return { ...output, ok: output.final === 'PASS' }
}

function loadEnv(){const keys=['NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','E2E_EXPECTED_PROJECT_REF'];const v=Object.fromEntries(keys.map(k=>[k,(process.env[k]??'').trim()]));if(Object.values(v).some(x=>!x))failLocal('missing_configuration');return{url:v.NEXT_PUBLIC_SUPABASE_URL,serviceKey:v.SUPABASE_SERVICE_ROLE_KEY,ref:v.E2E_EXPECTED_PROJECT_REF}}
function failLocal(message){throw new Error(message)}
function readJson(file){try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{failLocal('state_unavailable')}}
function validateContext(env,state){let u;try{u=new URL(env.url)}catch{return false}const linked=fs.readFileSync('tests/supabase-e2e-db/supabase/.temp/project-ref','utf8').trim();return u.protocol==='https:'&&u.hostname.endsWith('.supabase.co')&&u.hostname.split('.')[0]===env.ref&&linked===env.ref&&[state.auth,state.profiles,state.data].every(s=>s.projectRef===env.ref)}
function validateStateFiles(env,state,files,aliases){let ok=true;for(const f of files){const st=fs.statSync(f);const mode=st.mode&0o777;if(mode!==0o600||spawnSync('git',['check-ignore','-q',f]).status!==0)ok=false}const all=Object.keys(state.data.records??{});const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;const idsOk=[...Object.values(state.auth.users??{}),...Object.values(state.profiles.profiles??{}),...Object.values(state.data.records??{})].every(x=>!x.id||uuid.test(x.id));const noSecrets=!/(password|secret|token|session|refresh_token|service_role_key)/i.test(JSON.stringify(state));return ok&&Object.keys(state.auth.users??{}).length===4&&aliases.every(a=>all.includes(a))&&all.length===aliases.length&&idsOk&&noSecrets&&validateContext(env,state)}
async function validateAuth(client,state,read){const q=await read(client.auth.admin.listUsers({page:1,perPage:1000}),{ordinal:1,readClass:'BASELINE_AUTH_USERS'});const users=q.ok?q.rows?.users??[]:[];const expected=state.auth.users;const ok=users.length===4&&Object.entries(expected).every(([a,r])=>{const u=users.find(x=>x.id===r.id);return u&&u.email_confirmed_at&&u.user_metadata?.e2e_test===true&&u.user_metadata?.e2e_alias===a});return{ok,users:Object.fromEntries(Object.entries(expected).map(([a,r])=>[a,r.id]))}}
async function validateProfiles(client,state,authUsers,read){const ids=Object.values(authUsers);const q=await read(client.from('profiles').select('id,role,is_active').in('id',ids),{ordinal:2,readClass:'BASELINE_PROFILES'});const expected={e2e_admin:'admin',e2e_lab_staff:'lab_staff',e2e_teacher:'teacher',e2e_student:'student'};const rows=q.rows;const ok=q.ok&&rows.length===4&&Object.entries(expected).every(([a,role])=>{const id=state.profiles.profiles[a]?.id;const row=rows.find(x=>x.id===id);return row&&row.role===role&&row.is_active===true});return{ok,rows:Object.fromEntries(Object.entries(state.profiles.profiles).map(([a,r])=>[a,r.id]))}}
function checkItems(rows){const b=rows.find(r=>r.code==='E2E_ITEM_BULK'),t=rows.find(r=>r.code==='E2E_ITEM_TRACKED');return b&&t&&b.item_type==='consumable'&&b.status==='active'&&b.stock_total===10&&b.stock_available===8&&!b.track_individual&&t.item_type==='equipment'&&t.status==='active'&&t.stock_total===2&&t.stock_available===1&&t.track_individual}
function checkUnits(rows,items){const a=rows.find(r=>r.serial_code==='E2E_ITEM_TRACKED-001'),b=rows.find(r=>r.serial_code==='E2E_ITEM_TRACKED-002');return a&&b&&a.item_id===items.E2E_ITEM_TRACKED?.id&&b.item_id===items.E2E_ITEM_TRACKED?.id&&a.condition==='maintenance'&&a.availability_status==='unavailable'&&b.condition==='good'&&b.availability_status==='available'&&new Set(rows.map(r=>r.serial_code)).size===2}
function checkRequests(rows,auth,profiles){const s=rows.find(r=>r.comments==='E2E_REQUEST_STUDENT_PENDING'),r=rows.find(r=>r.comments==='E2E_REQUEST_STUDENT_REJECTED'),a=rows.find(r=>r.comments==='E2E_REQUEST_STUDENT_APPROVED'),g=rows.find(r=>r.comments==='E2E_REQUEST_TEACHER_GROUP');return s&&r&&a&&g&&s.user_id===profiles.e2e_student&&r.user_id===profiles.e2e_student&&a.user_id===profiles.e2e_student&&g.user_id===profiles.e2e_teacher&&s.status==='pending'&&r.status==='rejected'&&a.status==='delivered'&&g.status==='pending'&&r.approved_by===profiles.e2e_lab_staff&&typeof r.rejection_reason==='string'&&r.rejection_reason.includes('E2E')}
function checkLoans(rows,ids){const c1=ids.requests.E2E_REQUEST_STUDENT_APPROVED?.id;return rows.length===3&&rows.every(r=>r.user_id===ids.profiles.e2e_student&&r.delivered_by===ids.profiles.e2e_lab_staff)&&rows.find(r=>r.notes==='E2E_LOAN_ACTIVE')?.status==='active'&&rows.find(r=>r.notes==='E2E_LOAN_ACTIVE')?.request_id===c1&&rows.find(r=>r.notes==='E2E_LOAN_PARTIAL_RETURN')?.status==='partial_return'&&rows.find(r=>r.notes==='E2E_LOAN_PARTIAL_RETURN')?.request_id==null&&rows.find(r=>r.notes==='E2E_LOAN_FULL_RETURN')?.status==='returned'&&rows.find(r=>r.notes==='E2E_LOAN_FULL_RETURN')?.request_id==null}
function checkLoanItems(rows,ids){const by=Object.fromEntries(rows.map(r=>[ids.loans&&Object.keys(ids.loans).find(a=>ids.loans[a].id===r.loan_id),r]));const c1=by.E2E_LOAN_ACTIVE,c2=by.E2E_LOAN_PARTIAL_RETURN,c3=by.E2E_LOAN_FULL_RETURN;return rows.length===3&&[c1,c2,c3].every(r=>r&&r.item_id===ids.items.E2E_ITEM_BULK.id&&r.item_unit_id==null)&&c1.quantity===1&&c1.returned_quantity===0&&c2.quantity===2&&c2.returned_quantity===1&&c3.quantity===1&&c3.returned_quantity===1}
function checkMaintenance(m,ids){return m.item_id===ids.items.E2E_ITEM_TRACKED.id&&m.item_unit_id===ids.units['E2E_ITEM_TRACKED-001'].id&&m.maintenance_type==='preventive'&&m.activity==='E2E maintenance inspection'&&m.responsible==='E2E Laboratory Staff'&&m.created_by===ids.profiles.e2e_lab_staff&&m.observations==='E2E_MAINTENANCE_ACTIVE_01'}
function checkMovements(rows,ids,loans,returns){const sig=rows.map(r=>[r.item_id,r.movement_type,r.quantity,r.reference_table,r.reference_id].join('|'));const expected=[['bulk','loan_out',1,'loans'],['bulk','loan_out',2,'loans'],['bulk','loan_out',1,'loans'],['bulk','return_ok',1,'returns'],['bulk','return_ok',1,'returns'],['tracked','adjustment_down',1,'item_units']];const actual=rows.map(r=>[r.item_id===ids.items.E2E_ITEM_BULK.id?'bulk':r.item_id===ids.items.E2E_ITEM_TRACKED.id?'tracked':'other',r.movement_type,r.quantity,r.reference_table]);return rows.length===6&&expected.every(e=>actual.some(a=>a[0]===e[0]&&a[1]===e[1]&&a[2]===e[2]&&a[3]===e[3]))&&rows.find(r=>r.movement_type==='adjustment_down')?.reference_id===ids.units['E2E_ITEM_TRACKED-001'].id&&rows.every(r=>r.created_by===ids.profiles.e2e_lab_staff)}
function relationsOk(x){const {ids,units,requestItems,groups,groupItems,loanItems,returns,returnItems,maintenance,movements}=x;const trackedItem=ids.items?.E2E_ITEM_TRACKED,bulkItem=ids.items?.E2E_ITEM_BULK,teacherGroupRequest=ids.requests?.E2E_REQUEST_TEACHER_GROUP,firstGroup=groups?.rows?.[0],firstGroupItem=groupItems?.rows?.[0],trackedUnit=units.find(u=>u.serial_code==='E2E_ITEM_TRACKED-001');if(!trackedItem||!bulkItem||!teacherGroupRequest||!firstGroup||!firstGroupItem||!trackedUnit)return false;return units.every(u=>u.item_id===trackedItem.id)&&requestItems.every(r=>ids.requestsById?true:x.requests.some(q=>q.id===r.request_id))&&firstGroup.request_id===teacherGroupRequest.id&&firstGroupItem.request_group_id===firstGroup.id&&loanItems.every(li=>x.loans.some(l=>l.id===li.loan_id))&&returns.rows.every(r=>x.loans.some(l=>l.id===r.loan_id))&&returnItems.rows.every(ri=>returns.rows.some(r=>r.id===ri.return_id)&&loanItems.some(li=>li.id===ri.loan_item_id))&&maintenance[0]?.item_unit_id===trackedUnit.id&&movements.every(m=>m.item_id===bulkItem.id||m.item_id===trackedItem.id)}
function quantitativeOkFn(x){const b=x.items.find(i=>i.code==='E2E_ITEM_BULK'),t=x.items.find(i=>i.code==='E2E_ITEM_TRACKED'),u=x.units;if(!b||!t)return false;return b.stock_available>=0&&b.stock_available<=b.stock_total&&t.stock_available>=0&&t.stock_available<=t.stock_total&&b.stock_total===10&&b.stock_available===8&&t.stock_total===2&&t.stock_available===1&&u.filter(q=>q.availability_status==='available').length===1&&x.loanItems.every(li=>li.returned_quantity<=li.quantity)}
async function validateStaging(client,read){const qs=[];qs.push(await read(client.from('inventory_import_items_staging').select('code'),{ordinal:15,readClass:'BASELINE_STAGING_ITEMS'}));qs.push(await read(client.from('inventory_import_units_staging').select('asset_code'),{ordinal:16,readClass:'BASELINE_STAGING_UNITS'}));qs.push(await read(client.from('item_units_import_staging').select('serial_code'),{ordinal:17,readClass:'BASELINE_STAGING_ASSETS'}));return{ok:qs.every(q=>q.ok&&q.rows.length===0),detail:qs.every(q=>q.ok)?'all empty':'read unavailable'}}
function securityChecks(state,files){const scripts=fs.readdirSync('scripts/e2e').filter(f=>f.endsWith('.mjs')).map(f=>fs.readFileSync(path.join('scripts/e2e',f),'utf8')).join('\n');const hardUuid=/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(scripts);const hardEmail=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(scripts);const ignored=files.every(f=>spawnSync('git',['check-ignore','-q',f]).status===0);const perms=files.every(f=>(fs.statSync(f).mode&0o777)===0o600);const secrets=!/(password|secret|token|session|refresh_token|service_role_key)/i.test(JSON.stringify(state));return{ok:ignored&&perms&&secrets&&!hardUuid&&!hardEmail,detail:hardUuid||hardEmail?'hardcoded_sensitive_literal':'',stateHashes:files.map(f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'))}}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)
if (isMain) {
  const args=new Set(process.argv.slice(2))
  try {
    for(const arg of args) if(!['--confirm-e2e','--json'].includes(arg)) failLocal('unknown_argument')
    if(!args.has('--confirm-e2e')) failLocal('missing_confirm_e2e')
    const output=await runBaselineCore({ emit: true, jsonMode: args.has('--json') })
    process.exit(output.final==='PASS'?0:1)
  } catch (error) {
    console.error('ERROR: '+(error?.message ?? 'baseline_failed'))
    process.exit(2)
  }
}
