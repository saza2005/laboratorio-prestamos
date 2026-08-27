# Pruebas E2E

La suite usa Playwright y no debe ejecutarse contra datos reales de producción.

## Cuentas de prueba

Configura cuentas separadas mediante variables de entorno. Usa valores locales y nunca los guardes en Git:

```text
E2E_ADMIN_EMAIL=<admin-e2e-email>
E2E_ADMIN_PASSWORD=<admin-e2e-password>
E2E_LAB_STAFF_EMAIL=<lab-staff-e2e-email>
E2E_LAB_STAFF_PASSWORD=<lab-staff-e2e-password>
```

Si no se configuran las variables, las pruebas administrativas se marcan como omitidas.

Las pruebas de student y teacher requieren una estrategia de sesión institucional o un proyecto Supabase de pruebas con acceso por contraseña habilitado exclusivamente para cuentas E2E.

## Comandos por nivel

Smoke tests públicos y autenticación sin cuentas de prueba:

    timeout 90s npm run test:e2e:smoke

Pruebas de rutas administrativas con las cuentas E2E configuradas:

    timeout 90s npm run test:e2e:roles

Smoke público y read-only de CSP:

    PLAYWRIGHT_BASE_URL=https://<dominio> PLAYWRIGHT_NO_SERVER=1 timeout 90s npm run test:e2e:csp

Este smoke comprueba portada y login, y falla ante violaciones CSP o errores de
página. No crea sesiones ni envía formularios. La activación en modo de bloqueo
requiere además una validación autenticada con una sesión E2E vigente.

Suite completa:

    timeout 90s npm run test:e2e

Pruebas unitarias de permisos, sin levantar Next.js:

    npm run test:unit

Verificación segura previa a un commit:

    npm run check:safe

Este comando no levanta el servidor ni abre el navegador.

La plantilla sin secretos está en `tests/e2e-config.example` y el plan de datos en `tests/TEST_DATA.md`.

## Ejecutar con cuentas locales

Crea `tests/.env.e2e.local` a partir de `tests/e2e-config.example` y coloca allí las credenciales de prueba. Ese archivo está ignorado por Git. No lo compartas ni lo subas.

Después ejecuta:

    timeout 90s npm run test:e2e:roles

El test mutacional de solicitud solo se ejecuta con `E2E_MUTATIONS=true` y `E2E_ITEM_CODE` configurado. Crea y cancela una solicitud E2E; no lo actives contra producción.

Para ejecutar solo la prueba mutacional:

    timeout 90s npm run test:e2e:mutations
