# FASE 5 - Primera ejecución Playwright READ_ONLY

## 1. Entorno

- Proyecto: Supabase E2E.
- Rama: chore/e2e-supabase-baseline.
- Playwright: 1.62.1.
- Chromium: disponible.
- Puerto 3000: libre tras el intento.

## 2. Contrato

- FIRST_RUN_CONTRACT: PASS.
- Filtros P/A/L/T/S listados antes de ejecutar.
- --no-deps: soportado.

## 3. Baseline inicial

- PASS.

## 4. StorageState

- Preflight: PASS.
- Posterior: PASS.
- Hashes conservados: sí.

## 5. Bloque P

- Intentado: sí.
- Tests reales: 0.
- Resultado: FAIL antes del navegador por missing_expected_project_ref en webServer.

## 6. Bloque A

- NO_EJECUTADO.

## 7. Bloque L

- NO_EJECUTADO.

## 8. Bloque T

- NO_EJECUTADO.

## 9. Bloque S

- NO_EJECUTADO.

## 10. Auth y dependencies

- Auth setup: 0.
- Logins Auth: 0.
- Dependencies: no alcanzadas.

## 11. Artifacts

- Metadatos encontrados: 1.
- Screenshots/traces/videos de esta ejecución: 0.
- Potencialmente sensibles: 0.

## 12. Integridad posterior

- Baseline: PASS.
- StorageState: PASS.
- Escrituras public: 0.
- RPC negocio: 0.
- Acciones negocio: 0.

## 13. Cierre

- Next: detenido.
- Chromium: cerrado.
- Puerto 3000: libre.
- Dependencias modificadas: no.

## 14. Conclusión

- Primera ejecución READ_ONLY completa: no.
- Causa bloqueante: configuración webServer no propaga E2E_EXPECTED_PROJECT_REF al launcher.
- No se corrigió ni reintentó automáticamente.
- FASE 5.3B requiere nueva autorización.


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
