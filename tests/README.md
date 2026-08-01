# Pruebas E2E

La suite usa Playwright y no debe ejecutarse contra datos reales de producción.

## Cuentas de prueba

Configura cuentas separadas para admin y lab_staff mediante variables de entorno:

E2E_ADMIN_EMAIL=admin-de-prueba@ucuenca.edu.ec
E2E_ADMIN_PASSWORD=...
E2E_LAB_STAFF_EMAIL=labstaff-de-prueba@ucuenca.edu.ec
E2E_LAB_STAFF_PASSWORD=...

npm run test:e2e

Si no se configuran las variables, las pruebas administrativas se marcan como omitidas.

Las pruebas de student y teacher requieren posteriormente una estrategia de sesión Google institucional o un proyecto Supabase de pruebas con acceso por contraseña habilitado exclusivamente para cuentas E2E.

## Comandos por nivel

Smoke tests públicos y autenticación sin cuentas de prueba:

    timeout 90s npm run test:e2e:smoke

Pruebas de rutas administrativas con las cuentas E2E configuradas:

    timeout 90s npm run test:e2e:roles

Suite completa:

    timeout 90s npm run test:e2e

Pruebas unitarias de permisos, sin levantar Next.js:

    npm run test:unit

Verificación segura previa a un commit:

    npm run check:safe

Este comando no levanta el servidor ni abre el navegador.
