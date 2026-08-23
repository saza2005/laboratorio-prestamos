# FASE 5 - Auditoría de tests y plan de primera ejecución

## 1. Entorno

- Proyecto: Supabase E2E.
- Project Ref parcialmente oculto: rwni********wwim.
- Rama: chore/e2e-supabase-baseline.
- Playwright: 1.62.1.
- Baseline inicial: PASS.

## 2. Tests existentes

- Archivos funcionales E2E: 3.
- Definiciones funcionales: 9.
- Unit definitions: 7.
- Setup definition: 1.
- Listado Playwright: 64 instancias en 6 archivos.

## 3. Clasificación

- READ_ONLY: 13 definiciones (auth/public/unit).
- AUTH_ONLY: 3 definiciones (roles/access y setup).
- MUTATING_REVERSIBLE: 0.
- MUTATING_BASELINE: 0.
- UNKNOWN: 0.
- Candidatos seguros iniciales: smoke read-only nuevo y unit tests; los tests auth/roles requieren aislamiento de proyecto.

## 4. Roles

- admin: storageState admin.json.
- lab_staff: storageState lab-staff.json.
- teacher: storageState teacher.json.
- student: storageState student.json.
- Configuración: dependencies auth-* actualmente repite setup al ejecutar role projects.

## 5. Selectores

- Estables: roles accesibles, labels y IDs de login existentes.
- Frágiles: botón Entrar ambiguo en tests antiguos y selector de rol histórico corregido en auth setup.
- No se corrigieron tests funcionales existentes en esta fase.

## 6. Configuración

- baseURL: localhost:3000.
- webServer: launcher E2E seguro.
- Service role en Next/Playwright: no.
- Arquitectura recomendada: B, storageState cacheado sin repetir auth setup.

## 7. StorageState

- Validador inicial: PASS.
- Hashes registrados y preservados durante la auditoría.
- Estados modificados: no.

## 8. Artifacts

- Screenshot/trace solo ante fallos; video off.
- No se abrieron artifacts existentes.
- No publicar test-results ni reportes si contienen datos de sesión.

## 9. Smoke tests

- Creado: tests/e2e/smoke.readonly.spec.ts.
- Tests nuevos: 1 parametrizado por proyecto de rol.
- Solo navegación y assertions; no forms, Server Actions ni logout.

## 10. Auditoría estática

- Resultado: PASS para smoke nuevo.
- Escrituras remotas alcanzables: no.

## 11. Listado Playwright

- Ejecutado: sí, solo --list.
- Tests funcionales realmente ejecutados: 0.
- Logins: 0.

## 12. Plan de primera ejecución

- Bloques P, A, L, T, S definidos en el plan.
- Ningún bloque ejecutado.

## 13. Integridad

- Baseline posterior: PASS.
- StorageState posterior: PASS.
- Dependencias: sin cambios.
- Escrituras public: 0.

## 14. Conclusión

- FASE 5.3A: completada; no se ejecutaron tests funcionales.
- Lista para FASE 5.3B: sí, condicionada a usar estados cacheados y bloquear tests que hacen login interno.
