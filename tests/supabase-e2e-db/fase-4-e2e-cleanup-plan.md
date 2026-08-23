# FASE 4 — Limpieza segura

Protecciones: exigir --confirm-e2e; modo dry-run por defecto; verificar Project Ref; exigir prefijo E2E_ y UUIDs del estado; abortar ante registros fuera de la lista.

Orden FK: returns/return_items; loan_items/loan_group_items/loan_groups/loans; request_group_items/request_groups; request_items/requests; inventory_movements/maintenance_records; item_units; items; profiles; Auth users.

Usar transacción para public y una etapa separada para Auth. Validar conteos antes y después. Nunca borrar funciones, migraciones, policies, RLS, triggers, tablas de plataforma ni registros no etiquetados E2E.
