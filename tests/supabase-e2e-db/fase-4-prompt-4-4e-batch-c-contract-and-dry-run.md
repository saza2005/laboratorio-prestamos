# FASE 4 — Contrato y dry-run del lote C

## 1. Entorno
- Proyecto: Supabase E2E (rwni********wwim)
- Rama: chore/e2e-supabase-baseline
- Usuarios: 4
- Perfiles: 4
- Inventario: 2 items, 2 unidades
- Solicitudes: 4
- Préstamos iniciales: 0
- Dependencias modificadas: no

## 2. Contrato de préstamos
- Tablas: loans, loan_items, loan_groups, loan_group_items.
- Estados: active, returned, partial_return, overdue, cancelled.
- Creación: RPCs, no INSERT directo.
- Datos derivados: loan_items, movimientos y grupos cuando aplique.
- Incertidumbres: ninguna para C1-C3.

## 3. Contrato de devoluciones
- Tablas: returns y return_items.
- C2: devolución parcial con register_return_transaction, cantidad 1 de préstamo bulk 2.
- C3: devolución completa con register_full_return_transaction, cantidad 1.
- Stock y movimientos son efectos derivados de RPC.

## 4. RPC y actores
- C1: deliver_approved_request_with_units(uuid,jsonb,jsonb,uuid,text), lab_staff.
- C2/C3 préstamo: create_multi_item_loan_transaction(uuid,jsonb,date,text,uuid), lab_staff.
- C2 devolución: register_return_transaction(uuid,integer,integer,integer,text,uuid), lab_staff.
- C3 devolución: register_full_return_transaction(uuid,text,uuid), lab_staff.
- Service role como actor: no.
- Firmas verificadas: sí; overload legacy de entrega excluido.

## 5. Escenarios
- C1 usa E2E_REQUEST_STUDENT_APPROVED, item bulk cantidad 1, préstamo active.
- C2 préstamo directo bulk cantidad 2 y devolución parcial de 1, partial_return.
- C3 préstamo directo bulk cantidad 1 y devolución completa, returned.
- Solicitudes adicionales: no.
- Unidades patrimoniales: ninguna; no hay duplicación.
- Movimientos futuros: derivados por RPC, no en dry-run.

## 6. Script
- Batch C implementado para dry-run y execute futuro.
- Confirmación execute: E2E_TEST_DATA_CONFIRM=CREATE_E2E_TEST_DATA_BATCH_C.
- Estado local: sin cambios durante dry-run.
- Fallo parcial: estado atómico y detención.

## 7. Auditoría estática
- Insert/Update/Delete/RPC en dry-run: no.
- Entrega/préstamo/devolución/mantenimiento/staging: no.
- Proyecto normal: no.
- Secretos: 0.
- Consultas limitadas: sí.

## 8. Dry-run lote C
- Ejecutado: sí, una vez.
- Código de salida: 0.
- Loans antes/después: 0/0.
- Loan items antes/después: 0/0.
- Returns antes/después: 0/0.
- Return items antes/después: 0/0.
- C1: WOULD_CREATE.
- C2: WOULD_CREATE_AND_RETURN_PARTIAL.
- C3: WOULD_CREATE_AND_RETURN_FULL.
- Escrituras: 0.
- RPC: 0.
- Error: ninguno.

## 9. Seguridad
- Proyecto normal modificado: no.
- Proyecto E2E remoto modificado: no.
- Usuarios/perfiles/inventario/solicitudes modificados: no.
- test-data.json modificado: no; hash conservado.
- Staging Git: no.
- Commit: no.

## 10. Conclusión
- Contrato completo: sí.
- Payloads completos: sí.
- Script válido: sí.
- Dry-run válido: sí.
- Escenarios simultáneos viables: sí, usando bulk independiente.
- Conflictos: ninguno.
- Lote C listo: sí, requiere autorización independiente.
- Lote D: no preparado ni ejecutado.
