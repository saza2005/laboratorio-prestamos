#!/usr/bin/env node
import net from 'node:net'
import { spawn, spawnSync } from 'node:child_process'
import path from 'node:path'

const raw=process.argv.slice(2)
let port=3000
let production=false
for (const arg of raw) {
  if (arg === '--confirm-e2e') continue
  if (arg === '--production') { production=true; continue }
  if (arg.startsWith('--port=')) { port=Number(arg.slice(7)); continue }
  fail('unknown_argument')
}
if (!raw.includes('--confirm-e2e')) fail('missing_confirm_e2e')
if (!Number.isInteger(port) || port<1 || port>65535) fail('invalid_port')
const expected=(process.env.E2E_EXPECTED_PROJECT_REF||'').trim()
if (!expected) fail('missing_expected_project_ref')
await assertPortFree(port)
const safeGuardEnv=filteredEnv({...process.env,E2E_EXPECTED_PROJECT_REF:expected},true)
const guard=spawnSync(process.execPath,['--env-file=.env.app-e2e',path.join('scripts','e2e','verify-app-environment.mjs'),'--confirm-e2e'],{stdio:'inherit',env:safeGuardEnv})
if (guard.status !== 0) process.exit(guard.status ?? 1)
const nextEnv=filteredEnv(process.env,false)
const nextArgs=production
  ? [path.join('node_modules','next','dist','bin','next'),'start','-p',String(port)]
  : [path.join('node_modules','next','dist','bin','next'),'dev','--webpack','-p',String(port)]
const next=spawn(process.execPath,nextArgs,{stdio:'inherit',env:nextEnv})
const forward=signal=>{ if (!next.killed) next.kill(signal) }
process.on('SIGINT',()=>forward('SIGINT'))
process.on('SIGTERM',()=>forward('SIGTERM'))
next.on('exit',(code,signal)=>process.exit(code ?? (signal ? 1 : 0)))
function filteredEnv(input,keepExpected){
  const env={...input}
  for (const key of Object.keys(env)) if (/(SUPABASE_SERVICE_ROLE_KEY|E2E_.*_(PASSWORD|EMAIL|CONFIRM|TOKEN|SESSION)|ACCESS_TOKEN|REFRESH_TOKEN)/i.test(key)) delete env[key]
  delete env.NODE_OPTIONS
  if (!keepExpected) delete env.E2E_EXPECTED_PROJECT_REF
  return env
}
function assertPortFree(port){return new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',error=>{if(error.code==='EADDRINUSE') fail('port_in_use');reject(error)});server.listen(port,'127.0.0.1',()=>server.close(resolve))})}
function fail(code){console.error('APP_START: FAIL ('+code+')');process.exit(1)}
