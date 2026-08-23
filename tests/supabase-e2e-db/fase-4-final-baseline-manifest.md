# FASE 4 — Manifiesto final del baseline E2E

- Proyecto: Supabase E2E
- Project Ref parcialmente oculto: rwni********wwim
- Fecha de validación: 2026-08-06
- Rama: chore/e2e-supabase-baseline
- Resultado del validador: PASS
- Código de salida: 0
- Escrituras remotas durante esta auditoría: 0

## Conteos

| Área | Conteo |
|---|---:|
| Auth users | 4 |
| Profiles | 4 |
| Items | 2 |
| Item units | 2 |
| Requests | 4 |
| Request items | 4 |
| Request groups | 1 |
| Request group items | 1 |
| Loans | 3 |
| Loan items | 3 |
| Returns | 2 |
| Return items | 2 |
| Maintenance records | 1 |
| Inventory movements | 6 |
| Staging tables | 0 |
| Audit logs | 0 |

## Escenarios y estados

- E2E_ITEM_BULK: consumable, active, 10/8.
- E2E_ITEM_TRACKED: equipment, active, 2/1.
- E2E_ITEM_TRACKED-001: maintenance/unavailable.
- E2E_ITEM_TRACKED-002: good/available.
- E2E_REQUEST_STUDENT_PENDING: pending.
- E2E_REQUEST_STUDENT_REJECTED: rejected.
- E2E_REQUEST_STUDENT_APPROVED: delivered.
- E2E_REQUEST_TEACHER_GROUP: pending.
- E2E_LOAN_ACTIVE (C1): active, bulk 1/0/1.
- E2E_LOAN_PARTIAL_RETURN (C2): partial_return, bulk 2/1/1.
- E2E_LOAN_FULL_RETURN (C3): returned, bulk 1/1/0.
- E2E_MAINTENANCE_ACTIVE_01 (D1): preventive, unit 001 in maintenance/unavailable.

## Movimientos

- 3 loan_out sobre E2E_ITEM_BULK: cantidades 1, 2 y 1.
- 2 return_ok sobre E2E_ITEM_BULK: cantidad 1 cada uno.
- 1 adjustment_down sobre E2E_ITEM_TRACKED: cantidad 1, unidad 001.
- Duplicados o referencias externas: ninguno.

## Archivos de estado

| Archivo | Permisos | Tamaño | SHA-256 |
|---|---:|---:|---|
| .e2e-state/auth-users.json | 600 | 654 bytes | 1bd9727c83016597f73ddffb44d116b1e9561fa9af3290bc882fb9ac3f1c3932 |
| .e2e-state/profiles.json | 600 | 522 bytes | ca30c6355c95c777774a8eb473997bdcc59a13e616b56941090b6dc7d8b6fc02 |
| .e2e-state/test-data.json | 600 | 7238 bytes | b0870994ed161c1b3a4d195b4626f0bd117a6ac56acc571f7db96c12e8b0728e |

Los tres archivos están ignorados por Git, pertenecen al mismo proyecto E2E y no contienen secretos, tokens, sesiones ni correos completos.

## Validación

- AUTH: PASS
- PROFILES: PASS
- ITEMS: PASS
- ITEM_UNITS: PASS
- REQUESTS: PASS
- REQUEST_ITEMS: PASS
- REQUEST_GROUPS: PASS
- REQUEST_GROUP_ITEMS: PASS
- LOANS: PASS
- LOAN_ITEMS: PASS
- RETURNS: PASS
- RETURN_ITEMS: PASS
- MAINTENANCE: PASS
- INVENTORY_MOVEMENTS: PASS
- STAGING: PASS
- STATE_FILES: PASS
- RELATIONSHIPS: PASS
- QUANTITATIVE_INVARIANTS: PASS
- SECURITY: PASS
- Advertencia no bloqueante: audit_logs observado con 0 filas.

El proyecto normal no fue consultado ni modificado. No se ejecutaron RPC ni escrituras durante la auditoría.
