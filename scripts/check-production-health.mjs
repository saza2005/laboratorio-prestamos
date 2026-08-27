#!/usr/bin/env node

const baseUrl = (process.env.PRODUCTION_URL || '').replace(/\/$/, '')

if (!baseUrl || !baseUrl.startsWith('https://')) {
  fail('PRODUCTION_URL debe ser una URL HTTPS.')
}

const checks = [
  {
    name: 'home',
    path: '/',
    expectedStatus: 200,
    expectedText: 'Sistema de Gestión de Laboratorio',
  },
  {
    name: 'login',
    path: '/auth/login',
    expectedStatus: 200,
    expectedText: 'Iniciar sesión',
  },
]

for (const check of checks) {
  const startedAt = performance.now()
  const response = await request(check.path)
  const body = await response.text()

  if (response.status !== check.expectedStatus) {
    fail(`${check.name}: HTTP ${response.status}`)
  }

  if (!body.includes(check.expectedText)) {
    fail(`${check.name}: contenido semántico esperado ausente`)
  }

  console.log(`${check.name.toUpperCase()}=PASS`)
  console.log(`${check.name.toUpperCase()}_RESPONSE_MS=${Math.round(performance.now() - startedAt)}`)

  if (check.name === 'home') assertSecurityHeaders(response)
}

const callback = await request('/auth/callback', { redirect: 'manual' })
const callbackLocation = callback.headers.get('location')

if (callback.status !== 307) {
  fail(`oauth_callback: HTTP ${callback.status}`)
}

if (!callbackLocation) {
  fail('oauth_callback: redirección ausente')
}

const redirectUrl = new URL(callbackLocation, baseUrl)
if (
  redirectUrl.origin !== new URL(baseUrl).origin ||
  redirectUrl.pathname !== '/auth/login' ||
  redirectUrl.searchParams.get('error') !== 'google_auth_failed'
) {
  fail('oauth_callback: destino de error inesperado')
}

console.log('OAUTH_CALLBACK=PASS')
console.log('PRODUCTION_HEALTH=PASS')

function assertSecurityHeaders(response) {
  const requiredHeaders = [
    'content-security-policy',
    'content-security-policy-report-only',
    'x-content-type-options',
    'x-frame-options',
    'referrer-policy',
  ]

  for (const header of requiredHeaders) {
    if (!response.headers.get(header)) fail(`security_headers: ${header} ausente`)
  }

  console.log('SECURITY_HEADERS=PASS')
}

async function request(path, options = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)

  try {
    return await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'user-agent': 'laboratorio-prestamos-production-health/1.0',
        ...options.headers,
      },
      signal: controller.signal,
    })
  } catch (error) {
    const category = error instanceof Error ? error.name : 'unknown_error'
    fail(`${path}: solicitud fallida (${category})`)
  } finally {
    clearTimeout(timeout)
  }
}

function fail(message) {
  console.error(`PRODUCTION_HEALTH=FAIL (${message})`)
  process.exit(1)
}
