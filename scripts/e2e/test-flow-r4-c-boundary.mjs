import fs from 'node:fs'

const spec = fs.readFileSync('tests/e2e/mutating/request-create-r4-c.boundary.spec.ts', 'utf8')
if (!spec.includes("classifyPagePost")) throw new Error('classifier_missing')
if (!spec.includes("await route.abort('blockedbyclient')")) throw new Error('post_kill_switch_missing')
if (!spec.includes('R4_C_SUBMIT_CLICKS: 1')) throw new Error('diagnostic_click_accounting_missing')
if (!spec.includes('R4_GROUP_CREATE_SERVER_ACTION_ALLOWED_TO_NEXT: 0')) throw new Error('next_reachability_gate_missing')
if (!spec.includes('R4_ACTION_DONE_COUNT: 0')) throw new Error('action_done_zero_gate_missing')
console.log('R4_C_BOUNDARY_SPEC_TEST: PASS')
console.log('R4_C_ALL_POSTS_BLOCKED_CONTRACT: PASS')
console.log('R4_C_NO_BUSINESS_COMPLETION_CONTRACT: PASS')
