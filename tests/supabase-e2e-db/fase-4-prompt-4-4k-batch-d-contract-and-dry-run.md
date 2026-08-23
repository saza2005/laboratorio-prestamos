# FASE 4 — Contrato y dry-run del lote D

## 1. Entorno

- Proyecto: Supabase E2E
- Project Ref parcialmente oculto: rwni********wwim
- Rama: chore/e2e-supabase-baseline
- Usuarios: 4
- Perfiles: 4
- Inventario: 2 items, 2 unidades
- Préstamos: 3
- Movimientos: 5
- Mantenimientos iniciales: 0
- Dependencias modificadas: no

## 2. Contrato de mantenimiento

- Tabla: maintenance_records
- Campos obligatorios: activity, responsible, maintenance_date, maintenance_type
- Defaults: id gen_random_uuid(), created_at now()
- Relaciones: item_id a items, item_unit_id a item_units, created_by a profiles
- Estados: no existe columna de estado; D1 representa activo mediante registro existente y unidad en maintenance
- Constraints: maintenance_type preventive/corrective/general
- Triggers: sin trigger adicional requerido
- Policies: acceso de staff/admin
- Datos derivados: item_units e inventory_movements
- Incertidumbres: ninguna bloqueante

## 3. Contrato de unidad

- Unidad seleccionada: E2E_ITEM_TRACKED-001
- Estado inicial: good/available
- Estados válidos: condition good/damaged/maintenance/lost/retired; availability incluye available/unavailable/maintenance, entre otros
- Transición: good/available -> maintenance/unavailable
- Stock: tracked 2/2 antes; efecto esperado 2/1
- Préstamo activo: no
- Segunda unidad: E2E_ITEM_TRACKED-002 permanece good/available
- Incertidumbres: ninguna

## 4. RPC y aplicación

- RPC de mantenimiento: register_maintenance_record_transaction(uuid,uuid,text,text,date,text,text,text,boolean)
- RPC de estado: update_item_unit_status_transaction(uuid,text,text), llamada internamente
- Actor: e2e_lab_staff, lab_staff
- Firmas: confirmadas localmente
- Retornos: maintenance RPC devuelve uuid; update de unidad devuelve void
- Orden de operaciones: una RPC de mantenimiento que deriva el cambio de unidad
- Opción A/B/C/D: A
- Movimientos derivados: adjustment_down cantidad 1, reference item_units
- Service role como actor: no

## 5. Payload D1

- Alias: E2E_MAINTENANCE_ACTIVE_01
- Item: E2E_ITEM_TRACKED
- Unidad: E2E_ITEM_TRACKED-001
- Actor: e2e_lab_staff
- Tipo: preventive
- Descripción: E2E maintenance inspection
- Fechas: fecha actual válida; sin fecha final en el contrato
- Costo: no existe en la tabla; no enviado
- Estado final: registro presente y unidad maintenance/unavailable
- Stock esperado: 1/2 tracked
- Movimientos esperados: adjustment_down cantidad 1
- Campos inventados: ninguno

## 6. Script

- Batch D implementado: sí
- Scenario D1: sí
- Dry-run: solo SELECT
- Execute preparado: sí, no ejecutado
- Confirmación: CREATE_E2E_TEST_DATA_BATCH_D_D1
- Upsert: no
- Estado local: escritura futura atómica tras la RPC; sin cambios en dry-run
- Manejo de fallo parcial: detención ante el primer error

## 7. Auditoría estática

- Insert en dry-run: no
- Update en dry-run: no
- Delete en dry-run: no
- RPC en dry-run: no
- Mantenimiento: no alcanzable
- Cambio de unidad: no alcanzable
- Staging: no
- Proyecto normal: no
- Secretos: 0
- Consultas limitadas: sí

## 8. Dry-run lote D

- Ejecutado: sí, resultado final corregido
- Intentos: 2; el primero quedó bloqueado por validación local del rol en state, sin escrituras; el segundo terminó correctamente
- Código: 0 en el dry-run válido
- Maintenance antes: 0
- Movimientos antes: 5
- Unidad 001 antes: good/available
- Unidad 002 antes: good/available
- D1: WOULD_CREATE_AND_UPDATE_UNIT
- Maintenance después: 0
- Movimientos después: 5
- Escrituras: 0
- RPC: 0
- Error: ninguno en el dry-run final

## 9. Seguridad

- Proyecto normal modificado: no
- Proyecto E2E remoto modificado: no
- Usuarios modificados: no
- Perfiles modificados: no
- Inventario modificado: no
- Préstamos modificados: no
- test-data.json modificado: no
- Secretos: no mostrados
- Staging Git: no
- Commit: no

## 10. Conclusión

- Contrato completo: sí
- Flujo confirmado: opción A
- Payload completo: sí
- Script válido: sí
- Dry-run válido: sí
- Conflictos: ninguno
- Lote D listo: sí
- Requiere autorización: sí, para execute D1
- Problemas pendientes: ninguno bloqueante
- Siguiente paso: esperar autorización para registrar D1
