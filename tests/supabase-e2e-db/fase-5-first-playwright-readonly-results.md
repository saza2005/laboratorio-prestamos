# Primera ejecución Playwright READ_ONLY

## Preflight

- FIRST_RUN_CONTRACT: PASS.
- --no-deps: soportado.
- Baseline: PASS.
- StorageState: PASS.
- Tests seleccionados por listas: P=2, A=1, L=1, T=1, S=1.

## Bloque P

- Comando: npx playwright test --no-deps --project=chromium-admin tests/public/pages.spec.ts
- Resultado: FAIL antes de ejecutar tests.
- Causa: webServer no recibió E2E_EXPECTED_PROJECT_REF; launcher terminó con missing_expected_project_ref.
- Tests ejecutados: 0.
- Efectos remotos: 0.

## Bloque A

- NO_EJECUTADO por detención ante el fallo de P.

## Bloque L

- NO_EJECUTADO.

## Bloque T

- NO_EJECUTADO.

## Bloque S

- NO_EJECUTADO.

## Auth y dependencies

- --no-deps soportado: sí.
- Auth setup ejecutado: 0.
- Logins Auth: 0.
- Dependencies auth-* alcanzadas: 0.

## Artifacts

- Artifacts metadatos: 1.
- Screenshots: 0.
- Traces: 0.
- Videos: 0.
- Potencialmente sensibles: 0.

## StorageState

- Validador posterior: PASS.
- Hashes: conservados.

## Baseline

- Baseline posterior: PASS.
- Escrituras public: 0.
- RPC negocio: 0.

## Seguridad

- No se abrieron ni publicaron artifacts.
- No se mostraron cookies, tokens ni credenciales.

## Resultado

- FASE 5.3B: incompleta; bloqueada por configuración del webServer.
- Requiere corregir el paso de E2E_EXPECTED_PROJECT_REF y nueva autorización.


## Reintento después de corrección del entorno webServer

- Runner READ_ONLY: creado; entorno hijo filtrado.
- E2E_EXPECTED_PROJECT_REF disponible para webServer: sí, confirmado con --list.
- Bloque P: PASS, 2 tests públicos.
- Bloque A: FAIL antes de render autenticado; la navegación terminó en /auth/login.
- Bloques L/T/S: NO_EJECUTADOS por la regla de primer fallo.
- Tests reales: 3 (2 PASS, 1 FAIL).
- Auth setup/logins/logout: 0/0/0.
- Acciones de negocio, RPC de negocio y escrituras public: 0/0/0.
- StorageState posterior: PASS, hashes conservados.
- Baseline posterior: PASS.
- Artifacts: se conserva un screenshot y su contexto de error para diagnóstico; no se publicó su contenido.
- Causa adicional: el webServer no cargaba .env.app-e2e al invocar start-app-e2e.mjs.
- Corrección local preparada en playwright.config.ts; no se reintentaron bloques después del primer fallo.


## Intento 3 — reintento A/L/T/S tras aislar el entorno público

- Corrección auditada: el webServer carga únicamente .env.app-e2e; E2E_EXPECTED_PROJECT_REF llega por el entorno técnico filtrado.
- Credenciales E2E y service role enviadas a Next/runner READ_ONLY: no/no.
- Bloque P: no repetido.
- Bloque A: PASS, 1 smoke con chromium-admin y --no-deps.
- Bloque L: PASS, 1 smoke con chromium-lab-staff y --no-deps.
- Bloque T: PASS, 1 smoke con chromium-teacher y --no-deps.
- Bloque S: PASS, 1 smoke con chromium-student y --no-deps.
- Tests de este intento: 4; PASS: 4; FAIL: 0.
- Acumulado FASE 5.3B: 7 tests; PASS: 6; FAIL: 1 histórico.
- Auth setup, nuevos logins, logout: 0/0/0.
- Acciones de negocio, RPC de negocio y escrituras public: 0/0/0.
- StorageState posterior y hashes: PASS/conservados.
- Baseline posterior: PASS.
- Artifacts actuales: solo metadatos; el screenshot histórico del fallo A se mantiene documentado sin publicar.
- Next.js/Chromium detenidos; puerto 3000 libre.


## FASE 5.3C — ejecución restante

- Matriz pendiente creada.
- U: 7/7 PASS.
- PA: 2/2 PASS (AUTH-03/AUTH-04).
- AUTH-01/AUTH-02 excluidos por contexto anónimo/no safe_for_first_run.
- A2/L2/T2/S2: sin pendientes.
- Auth setup, logins, logout, acciones, RPC y escrituras: 0.
- StorageState y baseline posteriores: PASS.
