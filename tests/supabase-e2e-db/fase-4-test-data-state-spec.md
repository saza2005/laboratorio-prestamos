# Estado de datos E2E

El archivo .e2e-state/test-data.json conserva el lote A y añadirá registros del lote B con alias, tabla, UUID, requester_alias, item_alias, status, group_id cuando aplique, dependencias y operaciones ejecutadas. Las escrituras futuras serán atómicas y por operación. No contendrá secretos ni sesiones.
