# FASE 5.2A — Contrato Playwright y storageState

## Playwright existente

- Versión instalada: 1.62.1.
- Configuración previa: playwright.config.ts, existente.
- testDir previo: ./tests.
- baseURL previa: PLAYWRIGHT_BASE_URL o localhost:3000.
- Navegador previo: chromium Desktop Chrome.
- webServer previo: npm run dev; reemplazado para el flujo E2E seguro.
- Reporter previo: list.
- Retries: 2 en CI, 0 local.
- Trace: on-first-retry.
- Screenshots: only-on-failure.
- Video: no.
- Auth setup previo: no.
- storageState previo: 0.
- Tests previos: tests/auth, tests/public y tests/roles; no ejecutados.

## Contrato propuesto

- BaseURL: http://localhost:3000.
- WebServer: scripts/e2e/start-app-e2e.mjs con puerto 3000 y entorno público aislado.
- Setup projects: auth-admin, auth-lab-staff, auth-teacher, auth-student.
- Role projects: chromium-admin, chromium-lab-staff, chromium-teacher, chromium-student.
- Dependencias: cada proyecto chromium depende únicamente de su auth setup.
- Setup: tests/e2e/auth.setup.ts.
- Rutas esperadas: admin/lab_staff /dashboard; teacher/student /solicitudes.
- StorageState futuro: .e2e-state/playwright/{admin,lab-staff,teacher,student}.json.
- Reporter/artifacts: reporter list; test-results y reportes existentes permanecen fuera del state.
- Entorno Next: solo .env.app-e2e.
- Entorno runner: .env.e2e filtrado; service role no se reenvía al Playwright.
- Validación de Project Ref: verify-playwright-auth-environment.mjs y launcher E2E.
- Baseline: run-playwright-auth-setup.mjs ejecutará verify-baseline antes del setup futuro.
- Limpieza: cada contexto se cierra; no se ejecuta logout antes de guardar el estado.

## Pendiente

- Generación real de los cuatro estados requiere FASE 5.2B.
- Navegadores instalados: no se verificaron ejecutando Playwright ni se descargaron.
- Tests funcionales con storageState: pendientes.
