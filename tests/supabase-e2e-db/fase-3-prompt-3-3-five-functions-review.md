# FASE 3 — Revisión de cinco grants authenticated

## 1. Funciones analizadas

- `public.create_loan_transaction(uuid, uuid, integer, date, text, uuid)`
- `public.create_loan_with_unit_transaction(uuid, uuid, uuid, integer, date, text, uuid)`
- `public.deliver_approved_request(uuid, uuid, text)`
- `public.deliver_approved_request_with_units(uuid, jsonb, uuid, text)`
- `public.increment_stock(uuid, integer)`

## 2. Uso en el repositorio

- `create_loan_transaction`: uso activo no encontrado; invocación directa no; sustituida por `create_multi_item_loan_transaction`; evidencia: `app/prestamos/actions.ts` llama la RPC multi-item y la migración histórica la revoca como legacy.
- `create_loan_with_unit_transaction`: uso activo no encontrado; invocación directa no; sustituida por `create_multi_item_loan_transaction`; evidencia: el flujo actual de préstamos usa la RPC multi-item y la migración legacy revoca esta firma.
- `deliver_approved_request`: uso activo no encontrado; invocación directa no; sustituida por `deliver_approved_request_with_units` con detalle de ítems; evidencia: no aparece en código ejecutable y la migración legacy la revoca.
- `deliver_approved_request_with_units(uuid, jsonb, uuid, text)`: uso activo no encontrado para esta firma; invocación directa no; sustituida por la sobrecarga de cinco argumentos; evidencia: `app/dashboard/solicitudes/actions.ts:146` envía `p_units`, `p_items`, `p_delivered_by` y `p_notes`.
- `increment_stock`: uso activo no encontrado; invocación directa no; evidencia: migración `20260729_revoke_unused_authenticated_rpcs.sql` la documenta como no usada.

Las referencias adicionales encontradas están en migraciones, inventarios y reportes de auditoría; no demuestran uso runtime.

## 3. Dependencias SQL

- Las cinco son mutaciones o helpers mutacionales; no tienen triggers asociados.
- `create_loan_transaction` modifica préstamos, partidas de préstamo, stock y movimientos de inventario.
- `create_loan_with_unit_transaction` valida `auth.uid()` y rol, y modifica préstamos, partidas, stock, unidades y movimientos.
- `deliver_approved_request` entrega solicitudes y modifica préstamos, agrupaciones, stock, solicitudes y movimientos.
- La sobrecarga de entrega de cuatro argumentos valida `auth.uid()` y rol, pero es una variante antigua; la aplicación usa la sobrecarga de cinco argumentos.
- `increment_stock` solo incrementa `items.stock_available` y no tiene validación interna de sesión o rol.

No se encontró una llamada activa desde otra función que obligue a conservar EXECUTE para `authenticated`; la ejecución interna de una función SQL no requiere exponer su firma como RPC al cliente.

## 4. Seguridad

- `create_loan_transaction`: SECURITY INVOKER, propietario `postgres`, sin `auth.uid()` ni validación de rol; riesgo alto si conserva EXECUTE.
- `create_loan_with_unit_transaction`: SECURITY DEFINER, `search_path=public, pg_temp`, valida `auth.uid()`, responsable autenticado, rol y estado; riesgo alto de superficie innecesaria, aunque tiene controles internos.
- `deliver_approved_request`: SECURITY DEFINER, `search_path=public`, no valida `auth.uid()` ni rol; riesgo alto.
- `deliver_approved_request_with_units(uuid, jsonb, uuid, text)`: SECURITY DEFINER, `search_path=public, pg_temp`, valida autenticación, responsable y rol; riesgo alto de exposición legacy.
- `increment_stock`: SECURITY INVOKER, sin `auth.uid()`, rol o propiedad; riesgo alto.

Revocar `authenticated` no afecta los flujos activos identificados. Concederlo mantiene RPC legacy innecesarias, especialmente peligrosas en las variantes sin validación interna.

## 5. Clasificación

| Función | Clasificación | Estado deseado | Confianza | Evidencia |
|---|---|---|---|---|
| create_loan_transaction | LEGACY_UNUSED | authenticated=false | alta | Sin llamadas; revocación histórica explícita. |
| create_loan_with_unit_transaction | REPLACED_RPC | authenticated=false | alta | Flujo actual multi-item; revocación histórica de legacy. |
| deliver_approved_request | REPLACED_RPC | authenticated=false | alta | Sin llamadas; variante antigua revocada históricamente. |
| deliver_approved_request_with_units(uuid,jsonb,uuid,text) | REPLACED_RPC | authenticated=false | alta | La UI usa la sobrecarga de cinco argumentos; migración histórica la revoca. |
| increment_stock | LEGACY_UNUSED | authenticated=false | alta | Migración de revocación de RPC no usadas y sin llamada activa. |

## 6. Propuesta

- Grants authenticated a conservar: ninguno de estos cinco.
- Grants authenticated a añadir localmente: ninguno.
- Grants authenticated a revocar en E2E: las cinco firmas, una revocación específica por firma.
- Decisiones manuales: ninguna para el código actual; queda como supuesto operativo que no existen integraciones externas fuera del repositorio.
- Archivo `.review`: `fase-3-five-functions-permission-proposal.sql.review`.
- SQL ejecutado: ninguno.

## 7. Impacto

- Flujos activos: préstamos multi-item, entrega con unidades y detalle de ítems, inventario transaccional y devoluciones no dependen de estas firmas.
- Flujos legacy: préstamo unitario antiguo, entrega simple, entrega con unidades antigua e incremento directo de stock.
- Riesgo de regresión: bajo para la aplicación; debe confirmarse cualquier integración operativa externa antes de aplicar.
- Pruebas necesarias: préstamo con y sin unidad, entrega parcial/completa, inventario y validación de ACL.

## 8. Evaluación

- Equivalencia alcanzable: sí, revocando en E2E los cinco grants authenticated heredados.
- Se requiere migración: sí, una tercera migración correctiva de permisos en la rama E2E.
- Dirección de la corrección: E2E remoto hacia el estado local; primero validar localmente y luego dry-run remoto.
- Proyecto E2E listo para datos: no todavía; existe una diferencia de seguridad pendiente.
- Problemas pendientes: confirmar que no haya consumidores externos de estas RPC legacy y validar la migración en local.
- Siguiente paso: revisar y aprobar el `.review`, crear la migración local y ejecutar el plan de validación.

## 9. Seguridad operativa

- Proyecto normal modificado: no.
- Proyecto E2E modificado: no.
- Operaciones remotas: ninguna.
- Permisos modificados: no.
- Datos modificados: no.
- Secretos: no mostrados.
- Staging: no realizado.
- Commit: no realizado.
