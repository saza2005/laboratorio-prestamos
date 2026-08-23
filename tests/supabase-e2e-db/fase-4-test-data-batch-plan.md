# Plan de lotes de datos E2E

## Lote A — Base de inventario
- Entidades: E2E_ITEM_BULK y E2E_ITEM_TRACKED.
- Creacion futura: RPC create_inventory_item_transaction con sesion authenticated de e2e_admin.
- Derivados: dos item_units para E2E_ITEM_TRACKED; no se insertan directamente.
- No crea movimientos, mantenimiento, solicitudes, prestamos ni devoluciones.
- Autorizacion independiente requerida.

## Lote B — Solicitudes
- Solicitudes individuales y grupal, usando create_request_transaction y transiciones aprobada/rechazada por RPC.
- Depende del lote A.
- Autorizacion independiente requerida.

## Lote C — Prestamos y devoluciones
- Entrega, prestamos activo, devolucion parcial y completa mediante RPC activas.
- Depende del lote B.
- Autorizacion independiente requerida.

## Lote D — Mantenimiento y movimientos
- Mantenimiento mediante register_maintenance_record_transaction.
- Movimientos derivados de workflows; no insertar historicos manualmente.
- Depende de A y posiblemente C.
- Autorizacion independiente requerida.
