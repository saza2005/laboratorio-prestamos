# Migraciones de Supabase

`migrations/` contiene únicamente el lineage canónico que debe usar Supabase CLI.

- `20260805220647_baseline_public_schema.sql` representa el esquema remoto normal
  verificado el 25 de agosto de 2026.
- Las migrations posteriores contienen hardening incremental y cambios funcionales.
- `legacy-migrations/` conserva las 27 migrations históricas que produjeron el
  baseline. No deben volver a ejecutarse ni moverse a `migrations/`.

La base normal fue creada antes de que existiera un historial administrado por
Supabase CLI. Antes del primer `db push` se debe registrar el baseline como
`applied` y comprobar que solo las migrations posteriores aparecen pendientes.

No se debe ejecutar `supabase db push` si el baseline aparece como pendiente:
intentaría recrear objetos que ya existen en el entorno remoto.
