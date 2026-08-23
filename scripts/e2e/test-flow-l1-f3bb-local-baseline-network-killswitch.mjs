#!/usr/bin/env node

process.loadEnvFile('.env.e2e')

const originalFetch = globalThis.fetch
function requestMethodAndPath(input, init) {
  const request = typeof Request !== 'undefined' && input instanceof Request ? input : null
  const rawUrl = request?.url ?? (input instanceof URL ? input.href : String(input ?? ''))
  const method = String(request?.method ?? init?.method ?? 'GET').toUpperCase()
  let pathname = ''
  try {
    pathname = new URL(rawUrl, 'http://local.invalid').pathname
  } catch {}
  return { method, pathname }
}

globalThis.fetch = async (input, init) => {
  const { method, pathname } = requestMethodAndPath(input, init)
  if (method === 'GET' && pathname === '/auth/v1/admin/users') {
    return new Response(JSON.stringify({ users: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'x-total-count': '0' },
    })
  }
  throw new Error('LOCAL_NETWORK_KILLSWITCH')
}

try {
  const output = await import('./verify-baseline.mjs').then(({ runBaselineCore }) =>
    runBaselineCore({ emit: true, jsonMode: process.argv.includes('--json') }))
  process.exitCode = output?.final === 'PASS' ? 0 : 1
} finally {
  globalThis.fetch = originalFetch
}
