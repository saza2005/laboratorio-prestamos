# Plan de primera ejecución Playwright

No ejecutar en FASE 5.3A.

## Bloque P

- Futuro: ejecutar smoke público/read-only en un proyecto sin storageState o con un perfil controlado.
- Test: tests/public/pages.spec.ts.
- Cantidad: 2.
- Efecto remoto esperado: 0.
- Detener ante: 500, escritura o artifact sensible.

## Bloque A

- Futuro: chromium-admin con smoke.readonly.spec.ts y storageState cacheado.
- Cantidad: 1.
- Efecto remoto esperado: 0.

## Bloque L

- Futuro: chromium-lab-staff con smoke.readonly.spec.ts y storageState cacheado.
- Cantidad: 1.
- Efecto remoto esperado: 0.

## Bloque T

- Futuro: chromium-teacher con smoke.readonly.spec.ts y storageState cacheado.
- Cantidad: 1.
- Efecto remoto esperado: 0.

## Bloque S

- Futuro: chromium-student con smoke.readonly.spec.ts y storageState cacheado.
- Cantidad: 1.
- Efecto remoto esperado: 0.

## Nota de configuración

Antes de ejecutar bloques por rol, separar la dependencia auth-* o aceptar explícitamente los cuatro logins Auth adicionales. La recomendación es B: usar estados cacheados y no repetir setup.
