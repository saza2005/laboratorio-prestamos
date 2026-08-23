# FASE 4 — Creación aislada del mantenimiento D1

## 1. Entorno

- Proyecto: Supabase E2E
- Project Ref parcialmente oculto: rwni********wwim
- Rama: chore/e2e-supabase-baseline
- Script: scripts/e2e/create-test-data.mjs
- Dependencias modificadas: no

## 2. Actor e identidad

- Alias: e2e_lab_staff
- Rol: lab_staff
- Variables utilizadas: E2E_LAB_STAFF_EMAIL, E2E_LAB_STAFF_PASSWORD
- Variables incorrectas utilizadas: ninguna
- auth.uid: coincide con el operador
- UUID operador: corresponde a e2e_lab_staff, no mostrado
- Coincidencia: sí
- Sesión persistida: no
- Service role como actor: no

## 3. Preflight

- Ejecutado: sí
- Código: 0
- Maintenance antes: 0
- Movimientos antes: 5
- Stock tracked antes: 2/2
- Unidad 001: good/available
- Unidad 002: good/available
- D1: WOULD_CREATE_AND_UPDATE_UNIT
- Conflictos: ninguno

## 4. Ejecución

- Ejecutada: sí
- Intentos: 1
- Código: 0
- RPC: register_maintenance_record_transaction(uuid,uuid,text,text,date,text,text,text,boolean)
- Invocaciones: 1
- UUID retornado: sí, no mostrado
- Maintenance creado: sí
- Unidad actualizada: sí, como efecto derivado interno
- Movimiento generado: sí
- Fallo parcial: no
- Error: ninguno

## 5. Maintenance record

- Alias: E2E_MAINTENANCE_ACTIVE_01
- Item: E2E_ITEM_TRACKED
- Unidad: E2E_ITEM_TRACKED-001
- Tipo: preventive
- Actividad: E2E maintenance inspection
- Responsible: E2E Laboratory Staff
- Fecha: válida y registrada
- Created by: e2e_lab_staff
- Duplicados: no
- Conflictos: no

## 6. Estado local

- test-data.json actualizado: sí
- Lotes A/B/C conservados: sí
- Solo D1 añadido: sí
- Ignorado: sí
- Permisos: 600
- Project Ref: coincide con E2E
- Secretos: 0
- Tokens: 0
- Sesiones: 0

## 7. Inventario y movimientos

- Stock tracked inicial: 2/2
- Stock tracked final: 2/1
- Unidad 001 inicial: good/available
- Unidad 001 final: maintenance/unavailable
- Unidad 002 inicial: good/available
- Unidad 002 final: good/available
- Movimientos anteriores: 5
- Movimientos nuevos: 1
- Tipo: adjustment_down
- Cantidad: 1
- Consistencia: sí

## 8. Alcance y seguridad

- Solicitudes modificadas: no
- Préstamos modificados: no
- Devoluciones modificadas: no
- Bulk modificado: no
- Unidad 002 modificada: no
- Staging: 0
- Proyecto normal modificado: no
- Proyecto E2E modificado: sí, únicamente por D1 autorizado
- Sesiones almacenadas: no
- Secretos mostrados: no
- Staging Git: no
- Commit: no

## 9. Verificación posterior

- Maintenance records: 1
- Inventory movements: 6
- D1: ALREADY_EXISTS_MATCHING
- Unidad 001: maintenance/unavailable
- Unidad 002: good/available
- Stock: tracked 2/1; bulk 10/8
- Dry-run posterior: código 0
- Duplicados: no
- Conflictos: no

## 10. Conclusión

- Creación D1 completa: sí
- Maintenance creado: sí
- Unidad en mantenimiento: sí
- Inventario consistente: sí
- Lotes A/B/C intactos: sí
- Lote D completo: sí
- Datos E2E completos: sí
- Problemas pendientes: ninguno para D1
- Siguiente paso: detenerse; no cerrar mantenimiento ni ejecutar operaciones adicionales
