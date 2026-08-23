# FASE 4 — Scripts diferidos

No se crean scripts ejecutables todavía por faltar variables y autorización de escritura.

- create-users: Admin API, idempotente por email, exige Project Ref, --dry-run y --confirm-e2e; no imprime secrets.
- create-test-data: cliente de datos separado, alias/UUID state, transacción por lote y protección E2E.
- verify-test-data: solo SELECT, conteos, relaciones, roles y estados.
- cleanup-test-data: destructivo, exige confirmación, prefijo y UUID state.
