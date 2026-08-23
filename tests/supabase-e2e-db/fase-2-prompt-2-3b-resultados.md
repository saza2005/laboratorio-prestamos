# FASE 2 — Resultado del Prompt 2.3B

## 1. Estado

- Stack local: activo
- Rama: chore/e2e-supabase-baseline
- Proyecto remoto enlazado: no
- Migración base modificada: no
- Operaciones remotas: ninguna

## 2. Funciones

- Total: 24 funciones public, incluyendo overloads
- SECURITY DEFINER: 19
- SECURITY INVOKER: 5
- Con search_path seguro: 24 tienen configuración o no requieren SECURITY DEFINER; no se detectó SECURITY DEFINER sin search_path
- Ejecutables por PUBLIC: 0 efectivos
- Ejecutables por anon: 3 efectivos
- Ejecutables por authenticated: 19 efectivos
- Ejecutables por service_role: 24 efectivos

Funciones accesibles por anon:

1. register_full_return_transaction(uuid, text, uuid): mutacional; modifica devoluciones, detalles de devolución, préstamos, stock, unidades y movimientos. Valida sesión, coincidencia de receptor y rol staff. No se encontró llamada actual de la aplicación a esta RPC completa.
2. register_maintenance_record_transaction(uuid, uuid, text, text, date, text, text, boolean): mutacional; registra mantenimiento y puede actualizar la unidad. Valida auth.uid y rol admin/lab_staff. Se usa desde app/mantenimiento/actions.ts.
3. update_item_unit_status_transaction(uuid, text, text): mutacional; cambia condición/disponibilidad, stock y movimientos. Valida auth.uid y rol admin/lab_staff. Se usa desde app/inventario/actions.ts.

Las tres rechazan llamadas sin sesión por auth.uid() nulo. Aun así, el acceso anon es innecesario y se recomienda revocarlo.

## 3. Funciones accesibles por anon

- register_full_return_transaction: SECURITY DEFINER, permiso efectivo explícito a anon; mutacional; valida autenticación y rol; riesgo medio por superficie innecesaria; revocar anon.
- register_maintenance_record_transaction: SECURITY DEFINER, permiso efectivo explícito a anon; mutacional; valida autenticación y rol; riesgo medio; revocar anon.
- update_item_unit_status_transaction: SECURITY DEFINER, permiso efectivo explícito a anon; mutacional; valida autenticación y rol; riesgo medio-alto por afectar inventario/stock; revocar anon.

No hay posibilidad práctica de invocación anónima exitosa en el estado actual porque las tres funciones exigen usuario autenticado, pero la defensa debe existir también en ACL.

## 4. Uso real de RPC

| Función | Archivo | Tipo de invocación | Rol esperado | Flujo |
|---|---|---|---|---|
| create_request_transaction | app/solicitudes/actions.ts | Server Action | student/teacher autenticado | solicitud individual/grupal |
| cancel_own_request_transaction | app/solicitudes/actions.ts | Server Action | propietario autenticado | cancelar solicitud propia |
| approve_request_transaction | app/dashboard/solicitudes/actions.ts | Server Action | admin/lab_staff | aprobar solicitud |
| reject_request_transaction | app/dashboard/solicitudes/actions.ts | Server Action | admin/lab_staff | rechazar solicitud |
| deliver_approved_request_with_units | app/dashboard/solicitudes/actions.ts | Server Action | admin/lab_staff | entregar solicitud completa/parcial |
| create_multi_item_loan_transaction | app/prestamos/actions.ts | Server Action | admin/lab_staff | préstamo directo |
| register_return_transaction | app/devoluciones/actions.ts | Server Action | admin/lab_staff | devolución parcial/individual |
| register_full_return_transaction | app/devoluciones/actions.ts | Server Action | admin/lab_staff | devolución completa |
| create_inventory_item_transaction | app/inventario/actions.ts | Server Action | admin/lab_staff | crear inventario |
| update_item_unit_status_transaction | app/inventario/actions.ts | Server Action | admin/lab_staff | cambiar estado de unidad |
| register_maintenance_record_transaction | app/mantenimiento/actions.ts | Server Action | admin/lab_staff | registrar mantenimiento |
| get_dashboard_operational_summary | app/dashboard/page.tsx | Server Component | admin/lab_staff | resumen dashboard |

Todas las llamadas detectadas se ejecutan desde archivos con use server, salvo el resumen que se consulta desde Server Component. No se encontró llamada RPC directa desde componentes cliente.

## 5. Triggers

- Total local no interno: 5
- Definiciones: BEFORE UPDATE, función set_updated_at
- Tablas: item_units, items, loans, profiles y requests
- Columnas afectadas: updated_at
- Función asociada: public.set_updated_at()
- Necesidad: conservar; mantiene updated_at en modificaciones
- Recomendación: conservar

La migración contiene cinco CREATE OR REPLACE TRIGGER. La auditoría previa que indicó cero no contempló esa variante de sintaxis.

## 6. Warnings de lint

- Cast implícito de text a item_type/status en create_inventory_item_transaction, líneas aproximadas 56-57: riesgo funcional bajo/medio; no bloquea E2E; añadir cast explícito sería la corrección mínima.
- Parámetro p_upcoming_limit_date no utilizado en get_dashboard_operational_summary: riesgo funcional bajo; no bloquea E2E; retirar parámetro exigiría actualizar llamadas.
- Variable v_item no leída en register_maintenance_record_transaction: riesgo funcional bajo; no bloquea E2E; eliminar variable sería cambio cosmético.

## 7. Matriz de permisos recomendados

| Función | Tipo | Usada por aplicación | Rol esperado | PUBLIC actual | anon actual | authenticated actual | service_role actual | SECURITY DEFINER | Validación interna | Permiso recomendado |
|---|---|---|---|---|---|---|---|---|---|---|
| approve_request_transaction | mutación | app/dashboard/solicitudes/actions.ts | admin/lab_staff | authenticated | sí, rol interno |
| cancel_own_request_transaction | mutación | app/solicitudes/actions.ts | student/teacher, propietario | authenticated | sí, auth.uid y propiedad |
| create_inventory_item_transaction | mutación | app/inventario/actions.ts | admin/lab_staff | authenticated | sí, rol interno |
| create_loan_transaction | legacy mutación | no encontrada | no confirmado; legacy | service_role | no uso actual confirmado |
| create_loan_with_unit_transaction | legacy mutación | no encontrada | no confirmado; legacy | service_role | no uso actual confirmado |
| create_multi_item_loan_transaction | mutación | app/prestamos/actions.ts | admin/lab_staff | authenticated | sí, acción y función |
| create_request_transaction | mutación | app/solicitudes/actions.ts | student/teacher autenticado | authenticated | sí, auth.uid/rol/grupos |
| deliver_approved_request | legacy mutación | no encontrada | no confirmado; legacy | service_role | no uso actual confirmado |
| deliver_approved_request_with_units (legacy) | legacy mutación | no encontrada | no confirmado; overload antiguo | service_role | no uso actual confirmado |
| deliver_approved_request_with_units (actual) | mutación | app/dashboard/solicitudes/actions.ts | admin/lab_staff | authenticated | sí, acción y función |
| ensure_google_institutional_profile | mutación auth/perfil | no encontrada | usuario autenticado Google | authenticated | validación interna |
| get_dashboard_inventory_summary | lectura | no llamada RPC encontrada | usuario autenticado; revisar necesidad | authenticated | RLS/invoker |
| get_dashboard_operational_summary | lectura | app/dashboard/page.tsx | admin/lab_staff | authenticated | sí, rol interno |
| get_my_role | helper/lectura | no llamada RPC encontrada | usuario autenticado | authenticated | invoker; perfil actual |
| handle_new_user | helper/trigger | no llamada RPC encontrada; sin trigger local | trigger de auth si existiera | authenticated | función tipo trigger |
| increment_stock | legacy helper | no encontrada | no confirmado; legacy | service_role | sin uso actual confirmado |
| is_admin_or_lab_staff | helper RLS | policies y funciones SQL | RLS staff | authenticated | helper SECURITY DEFINER |
| is_teacher | helper RLS | policies y funciones SQL | RLS teacher | authenticated | helper SECURITY DEFINER |
| register_full_return_transaction | mutación | app/devoluciones/actions.ts | admin/lab_staff | anon + authenticated | sí, auth.uid y rol |
| register_maintenance_record_transaction | mutación | app/mantenimiento/actions.ts | admin/lab_staff | anon + authenticated | sí, auth.uid y rol |
| register_return_transaction | mutación | app/devoluciones/actions.ts | admin/lab_staff | authenticated | sí, auth.uid y rol |
| reject_request_transaction | mutación | app/dashboard/solicitudes/actions.ts | admin/lab_staff | authenticated | sí, rol interno |
| set_updated_at | trigger/helper | triggers items/item_units/loans/profiles/requests | trigger | authenticated | no RPC de aplicación |
| update_item_unit_status_transaction | mutación | app/inventario/actions.ts | admin/lab_staff | anon + authenticated | sí, auth.uid y rol |

PUBLIC no tiene permiso efectivo para las funciones auditadas. La matriz completa de ACL, firmas y retorno está en fase-2-function-permissions-local.csv.

## 8. Propuesta de hardening

- Archivo: fase-2-propuesta-hardening-rpc.sql.review
- Funciones con revocación propuesta: register_full_return_transaction, register_maintenance_record_transaction y update_item_unit_status_transaction
- Cambios sobre PUBLIC: revocar explícitamente EXECUTE en las tres firmas
- Cambios sobre anon: revocar explícitamente EXECUTE en las tres firmas
- Cambios sobre authenticated: conservar/grant explícito
- Cambios sobre service_role: ninguno
- Cambios ejecutados: ninguno
- El archivo termina en .review y no es una migración aplicable

## 9. Riesgos pendientes

- Críticos: ninguno observado en esta auditoría local
- Altos: permisos anon innecesarios en tres mutaciones SECURITY DEFINER; se propone revocarlos
- Medios: grants a funciones legacy y overloads no utilizados; revisar antes de exponer el proyecto E2E
- Bajos: tres warnings de lint no bloqueantes

## 10. Conclusión

- Es seguro enlazar el proyecto E2E sin cambios: técnicamente el stack local funciona, pero se recomienda aplicar primero el hardening de anon
- Se requiere migración de hardening: sí, mínima y limitada a tres RPC
- Triggers deben conservarse: sí, los cinco set_updated_at forman parte del esquema funcional
- Warnings bloquean la fase: no
- Siguiente paso: revisar la propuesta .review y, con autorización, convertirla en una nueva migración local de seguridad; no se creó ni ejecutó todavía
