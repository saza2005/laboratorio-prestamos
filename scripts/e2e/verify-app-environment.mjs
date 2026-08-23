#!/usr/bin/env node
const args=new Set(process.argv.slice(2))
for (const arg of args) if (arg !== '--confirm-e2e') fail('unknown_argument')
if (!args.has('--confirm-e2e')) fail('missing_confirm_e2e')
const url=(process.env.NEXT_PUBLIC_SUPABASE_URL||'').trim()
const anon=(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'').trim()
const expected=(process.env.E2E_EXPECTED_PROJECT_REF||'').trim()
if (!url || !anon || !expected) fail('missing_app_configuration')
let ref=''
try { const parsed=new URL(url); if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.supabase.co')) fail('invalid_supabase_url'); ref=parsed.hostname.split('.')[0] } catch { fail('invalid_supabase_url') }
if (ref !== expected) fail('project_ref_mismatch')
const forbidden=Object.keys(process.env).filter(k=>/(SUPABASE_SERVICE_ROLE_KEY|E2E_.*_(PASSWORD|EMAIL)|E2E_.*_(CONFIRM|TOKEN|SESSION)|ACCESS_TOKEN|REFRESH_TOKEN)/i.test(k))
if (forbidden.length) fail('forbidden_secret_environment')
console.log('APP_ENVIRONMENT: PASS')
console.log('PROJECT_REF_MATCH: PASS')
console.log('BROWSER_SAFE_VARS: PASS')
console.log('FORBIDDEN_SECRETS: 0')
function fail(code){console.error('APP_ENVIRONMENT: FAIL ('+code+')');process.exit(1)}
