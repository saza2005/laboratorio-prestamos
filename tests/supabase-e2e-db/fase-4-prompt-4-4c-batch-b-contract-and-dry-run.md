# FASE 4 — Contrato y dry-run del lote B

## 1. Entorno
- Proyecto: Supabase E2E (rwni********wwim)
- Rama: chore/e2e-supabase-baseline
- Usuarios: 4
- Perfiles: 4
- Inventario: 2 items, 2 unidades
- Solicitudes iniciales: 0
- Dependencias modificadas: no

## 2. Contrato de solicitudes
- Tablas: requests, request_items, request_groups, request_group_items.
- Creación exclusivamente por create_request_transaction(text,text,date,jsonb,jsonb).
- Estados: pending, approved, rejected, cancelled, delivered, returned, partial_return.
- Grupos: payload p_groups, con docente autenticado y estudiante líder activo.
- Datos derivados: request_items y, para grupos, request_groups/request_group_items.
- Incertidumbres: ninguna para el dry-run.

## 3. RPC y actores
- Creación individual y grupal: student/teacher, RPC activa.
- Aprobación y rechazo: lab_staff mínimo, RPC activas.
- Service role como actor de negocio: no.
- Firmas verificadas: sí.

## 4. Payloads
- Cuatro escenarios documentados en fase-4-batch-b-request-payload-plan.csv.
- Cantidad: 1.
- Fecha: futura, calculada localmente.
- Inventario: únicamente E2E_ITEM_BULK/E2E_ITEM_TRACKED.
- Campos inventados: no.

## 5. Script
- Batch B implementado para dry-run y execute futuro; execute no ejecutado.
- Confirmación execute separada: requerida.
- Upsert: no.
- Estado local: sin cambios durante dry-run.

## 6. Auditoría estática
- Insert/Update/Delete/RPC en dry-run: no.
- Entrega, préstamo, staging y proyecto normal: no.
- Secretos: 0.
- Consultas limitadas: sí.

## 7. Dry-run lote B
- Ejecutado: sí, una vez.
- Código de salida: 0.
- Requests antes/después: 0/0.
- Request items antes/después: 0/0.
- Request groups antes/después: 0/0.
- Request group items antes/después: 0/0.
- Pending: WOULD_CREATE.
- Rejected: WOULD_CREATE_AND_TRANSITION.
- Approved: WOULD_CREATE_AND_TRANSITION.
- Group: WOULD_CREATE.
- Escrituras: 0.
- RPC: 0.
- Error: ninguno.

## 8. Seguridad
- Proyecto normal modificado: no.
- Proyecto E2E remoto modificado: no.
- Usuarios/perfiles/inventario modificados: no.
- test-data.json modificado: no.
- Staging Git: no.
- Commit: no.

## 9. Conclusión
- Contrato completo: sí.
- Payloads completos: sí.
- Script válido: sí; node --check correcto.
- Dry-run válido: sí.
- Conflictos: ninguno.
- Lote B listo para creación real: sí, requiere autorización independiente.
- Lotes C/D: no preparados ni ejecutados en esta tarea.
