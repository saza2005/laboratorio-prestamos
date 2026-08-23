# Flujo de mantenimiento D1

La acción app/mantenimiento/actions.ts valida el rol de gestión de inventario, equipo activo de tipo equipment, unidad perteneciente al equipo, unidad no prestada, fecha y tipo. Luego llama una sola vez a register_maintenance_record_transaction.

Payload D1: p_item_id=E2E_ITEM_TRACKED, p_item_unit_id=E2E_ITEM_TRACKED-001, p_activity=E2E maintenance inspection, p_responsible=E2E Laboratory Staff, p_maintenance_date=fecha actual válida, p_observations=E2E_MAINTENANCE_ACTIVE_01, p_maintenance_type=preventive, p_mark_unit_unavailable=true.

La función registra maintenance_records y llama internamente a update_item_unit_status_transaction con condición maintenance. Esa llamada deriva availability unavailable, reduce stock_available en 1 y crea un movimiento adjustment_down. El actor es e2e_lab_staff; no se usa service role como actor de negocio.

No se ejecuta cierre de mantenimiento en D1.
