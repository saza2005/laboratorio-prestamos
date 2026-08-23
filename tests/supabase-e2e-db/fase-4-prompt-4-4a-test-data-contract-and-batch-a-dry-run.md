# FASE 4 — Contrato de datos y dry-run del lote A

## 1. Entorno

- Proyecto: Supabase E2E
- Project Ref parcialmente oculto: rwni********wwim
- Rama: chore/e2e-supabase-baseline
- Usuarios Auth: 4
- Perfiles: 4
- Datos iniciales: items y item_units 0; demas tablas 0
- Dependencias modificadas: no

## 2. Contrato

- Tablas revisadas: items, item_units, requests, request_items, request_groups, request_group_items, loans, loan_items, loan_groups, loan_group_items, returns, return_items, maintenance_records, inventory_movements y staging
- Relaciones: items -> item_units; profiles -> items/loans/requests/movements; FK y acciones documentadas en el contrato
- Enums: item_type, item_status, unit_condition, unit_availability, request_status, loan_status, user_role
- Triggers: updated_at solamente; no trigger Auth para datos de inventario
- Policies: items/item_units administradas por admin/lab_staff; el script usa lectura administrativa solo para auditoria
- Tablas staging: revisadas y excluidas
- Campos inciertos: ninguno para lote A; los flujos posteriores requieren validacion por RPC
- Contrato: fase-4-test-data-schema-contract.md

## 3. RPC y flujos

- RPC activas: create_inventory_item_transaction, create_request_transaction, approve_request_transaction, reject_request_transaction, create_multi_item_loan_transaction, deliver_approved_request_with_units, register_return_transaction, register_full_return_transaction, register_maintenance_record_transaction y update_item_unit_status_transaction
- RPC legacy: create_loan_transaction, create_loan_with_unit_transaction, deliver_approved_request de cuatro argumentos, overload legacy de deliver y increment_stock
- Creacion directa permitida: no para items del lote A; se recomienda RPC para invariantes
- Datos derivados: item_units para el item tracked y movimientos en workflows posteriores
- Estados: enums y validaciones documentados en fase-4-test-data-state-machine.md
- Transiciones: solicitudes, prestamos, devoluciones y mantenimiento quedan para lotes B-D
- Matriz: fase-4-test-data-rpc-matrix.csv

## 4. Dataset

- Entidades planificadas: inventario, solicitudes, prestamos, devoluciones, mantenimiento y movimientos
- BASE_DATA: dos items conceptuales; su escritura futura sera workflow/RPC para preservar invariantes
- WORKFLOW_DATA: solicitudes, aprobaciones, entregas, prestamos, devoluciones y mantenimiento
- DERIVED_DATA: dos item_units y movimientos generados
- Prefijo: E2E_
- Estrategia IDs: codes/seriales para lookup y UUID en estado futuro
- Lotes: A inventario; B solicitudes; C prestamos/devoluciones; D mantenimiento/movimientos
- Dataset: fase-4-test-data-dataset-plan.csv

## 5. Script

- Ruta: scripts/e2e/create-test-data.mjs
- Modos: --dry-run y --execute
- Lotes: A, B, C y D; solo A preparado
- Confirmaciones: --confirm-e2e y E2E_TEST_DATA_CONFIRM para execute
- Upsert: no
- Staging: no
- Estado: .e2e-state/test-data.json solo execute
- Manejo de conflictos: bloquea ante registros incompatibles

## 6. Auditoria estatica

- Insert en dry-run: no
- Update en dry-run: no
- Delete en dry-run: no
- RPC en dry-run: no
- Staging: no
- Proyecto normal: no referenciado
- Secretos: 0 hardcodeados
- Consultas limitadas: si, perfiles Auth E2E, dos codes y dos seriales E2E
- Auditoria: fase-4-create-test-data-script-static-audit.md

## 7. Dry-run lote A

- Ejecutado: si
- Intentos: 1
- Codigo de salida: 0
- Registros antes: items 0; item_units 0
- Resultados: E2E_ITEM_BULK WOULD_CREATE; E2E_ITEM_TRACKED WOULD_CREATE; E2E_ITEM_TRACKED-001 WOULD_CREATE; E2E_ITEM_TRACKED-002 WOULD_CREATE
- Registros despues: items 0; item_units 0
- Escrituras: 0
- RPC: 0
- Error: ninguno
- Staging: tres tablas con 0 registros
- Salida: fase-4-create-test-data-batch-a-dry-run.txt

## 8. Seguridad

- Proyecto normal modificado: no
- Proyecto E2E remoto modificado: no
- Usuarios modificados: no
- Perfiles modificados: no
- Datos creados: no
- Archivo test-data state: no creado
- Secretos: no mostrados
- Staging Git: no
- Commit: no

## 9. Conclusion

- Contrato completo: si para lote A; flujos B-D quedan documentados para validacion posterior
- Dataset valido: si, con separacion BASE/WORKFLOW/DERIVED
- Script valido: si
- Dry-run valido: si
- Conflictos: ninguno
- Lote A listo: si para autorizacion separada de ejecucion RPC autenticada
- Requiere autorizacion: si
- Problemas pendientes: no ejecutar aun lotes B-D ni usar staging
- Siguiente paso: autorizar independientemente la creacion del lote A; no crear solicitudes ni otros datos
