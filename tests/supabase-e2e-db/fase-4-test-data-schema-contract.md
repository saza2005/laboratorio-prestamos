# Contrato de solicitudes, préstamos y devoluciones E2E

## Préstamos
- loans: id, request_id nullable, user_id required, delivered_by, delivery_date default, expected_return_date, returned_at, status loan_status default active, notes, timestamps.
- loan_items: loan_id, item_id, optional item_unit_id, quantity > 0, returned_quantity/damaged_quantity/missing_quantity non-negative.
- loan_groups and loan_group_items son derivados para entregas grupales; no se usan en C1-C3.
- loan_status: active, returned, partial_return, overdue, cancelled.
- Préstamos directos se crean con create_multi_item_loan_transaction y actor lab_staff.

## Devoluciones
- returns enlaza loan_id y received_by.
- return_items enlaza return_id y loan_item_id, con cantidades ok/damaged/missing no negativas.
- C2 usa register_return_transaction con quantity_ok=1 de un préstamo bulk de cantidad 2; resultado partial_return.
- C3 usa register_full_return_transaction; resultado returned.
- Las RPC actualizan stock y generan inventory_movements; no se insertan filas manualmente.

## Entrega
- C1 usa exclusivamente deliver_approved_request_with_units(uuid,jsonb,jsonb,uuid,text), la sobrecarga activa de cinco argumentos.
- La solicitud aprobada contiene item bulk y no requiere unidad patrimonial.
- La sobrecarga legacy de cuatro argumentos queda fuera.
- No se requieren solicitudes adicionales para C2/C3 porque el contrato permite préstamos directos.


## Contrato D1 de mantenimiento

| table | column | type | nullable | default | constraint | references | generated_or_triggered | direct_insert_allowed | recommended_creation_method | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| maintenance_records | id | uuid | no | gen_random_uuid() | PK | - | no | no | register_maintenance_record_transaction | workflow-generated |
| maintenance_records | item_id | uuid | sí | null | FK | items(id) ON DELETE CASCADE | no | no | register_maintenance_record_transaction | equipment item |
| maintenance_records | item_unit_id | uuid | sí | null | FK | item_units(id) ON DELETE SET NULL | no | no | register_maintenance_record_transaction | selected tracked unit |
| maintenance_records | activity | text | no | - | NOT NULL | - | no | no | register_maintenance_record_transaction | required |
| maintenance_records | responsible | text | no | - | NOT NULL | - | no | no | register_maintenance_record_transaction | required |
| maintenance_records | maintenance_date | date | no | - | NOT NULL | - | no | no | register_maintenance_record_transaction | valid date |
| maintenance_records | observations | text | sí | null | - | - | no | no | register_maintenance_record_transaction | E2E marker |
| maintenance_records | maintenance_type | text | no | - | CHECK preventive/corrective/general | - | no | no | register_maintenance_record_transaction | D1 uses preventive |
| maintenance_records | created_by | uuid | sí | null | FK | profiles(id) | auth.uid() | no | register_maintenance_record_transaction | authenticated operator |
| maintenance_records | created_at | timestamp | sí | now() | - | - | yes | no | register_maintenance_record_transaction | default |

D1 uses register_maintenance_record_transaction with p_mark_unit_unavailable=true. That function invokes update_item_unit_status_transaction internally, so the unit transition and adjustment movement are derived atomically.