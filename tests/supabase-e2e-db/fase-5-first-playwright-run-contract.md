# FASE 5.3A - Contrato de primera ejecución Playwright

## Estado

- Baseline: requerido y debe pasar antes y después.
- StorageState: cuatro archivos válidos, sin modificar.
- Browser: Chromium.
- Base URL: localhost:3000.
- Tests funcionales ejecutados en esta fase: 0.

## Clasificación

- READ_ONLY: páginas públicas, navegación protegida sin sesión cuando exista un proyecto anónimo, y unit tests.
- AUTH_ONLY: setup y roles/access; no son candidatos iniciales porque repiten login.
- MUTATING_*: ninguno demostrado en los archivos revisados.
- UNKNOWN: ninguno en los archivos revisados.

## Primera ejecución recomendada

- Arquitectura recomendada: B, usar storageState existente sin repetir setup para los proyectos funcionales.
- La configuración actual mantiene dependencies hacia auth-*; ejecutar chromium-* actualmente vuelve a ejecutar su setup.
- No ejecutar roles/access en el primer bloque: hacen login dentro del test y pueden cruzar roles.
- No ejecutar auth/login sin un proyecto sin storageState: sus expectativas anónimas no son compatibles con los role projects actuales.
- Candidatos seguros: smoke.readonly.spec.ts por cada proyecto de rol y unit tests sin servidor.

## Detención

Detener ante error 500, redirección inesperada, evidencia de escritura, cambio de baseline, selector ambiguo o artifact con secretos.

## Artifacts

Mantener screenshot solo-on-failure, trace on-first-retry y video off. No publicar test-results ni reportes; revisar metadatos sin abrir entradas potencialmente sensibles.
