import fs from 'node:fs'

const source = fs.readFileSync('tests/e2e/mutating/request-approve.browser-armed.spec.ts', 'utf8')

if (!source.includes("page.goto('/dashboard/solicitudes')")) throw new Error('missing_protected_route_gate')
if (!source.includes("getByPlaceholder('Buscar por solicitante, correo, propósito, ítem o código patrimonial')")) {
  throw new Error('missing_request_surface_gate')
}
if (source.includes("getByText('Rol: Administrador'")) throw new Error('stale_role_surface_assertion')
if (!source.includes("writeSignal(signalPath, runId, 'BROWSER_READY')")) throw new Error('missing_browser_ready_signal')
if (source.includes('seed-mutating-r3') || source.includes('approveRequestWithState')) {
  throw new Error('business_write_in_browser_ready_gate')
}

console.log('BROWSER_READY_ROLE_ASSERTION_REGRESSION_TEST: PASS')
