# FASE 5.3B — Causa raíz de arranque READ_ONLY

## Diagnóstico

El primer intento no alcanzó el navegador porque el webServer no propagaba E2E_EXPECTED_PROJECT_REF al launcher. El runner READ_ONLY con entorno filtrado fue añadido y la comprobación --list confirmó que el valor técnico llega al webServer sin reenviar credenciales.

En el reintento, el bloque P pasó. El bloque A falló antes de cualquier acción de negocio porque Next.js arrancó sin cargar .env.app-e2e: la configuración del webServer invocaba start-app-e2e.mjs sin node --env-file=.env.app-e2e. El smoke autenticado fue redirigido a /auth/login, mientras las páginas públicas, que no requieren Supabase, sí cargaron.

## Corrección local preparada

playwright.config.ts ahora invoca node --env-file=.env.app-e2e scripts/e2e/start-app-e2e.mjs --confirm-e2e --port=3000.

E2E_EXPECTED_PROJECT_REF continúa llegando mediante el entorno reducido del runner. Las credenciales, la service role y las variables de escritura siguen excluidas del proceso Next.js.

## Ejecución detenida

- Bloque P: PASS, 2 tests.
- Bloque A: FAIL, redirección a /auth/login.
- Bloques L/T/S: no ejecutados por la regla de primer fallo.
- Auth setup, logins y logout: 0.
- Escrituras públicas y RPC de negocio: 0.
- Baseline y storageState posteriores: PASS.

La corrección queda pendiente de una nueva autorización de ejecución; no se reintentó ningún bloque en esta fase.
