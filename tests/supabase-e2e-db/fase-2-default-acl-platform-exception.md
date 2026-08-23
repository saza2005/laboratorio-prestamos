# FASE 2 — Excepción del default ACL de plataforma

- El default ACL de funciones de supabase_admin en public es gestionado por la plataforma.
- El ejecutor local no tiene permiso para modificarlo; por eso no se incluye ALTER DEFAULT PRIVILEGES en la migración reproducible.
- Las 24 funciones actuales quedan endurecidas explícitamente mediante revocaciones de PUBLIC y anon.
- Toda nueva función de aplicación debe incluir esas dos revocaciones en la misma migración que la crea o reemplaza.
- Antes de modificar defaults remotamente debe confirmarse el rol real que crea las funciones y su autorización.
- El default ACL no concede acceso efectivo sobre las funciones actuales después de las revocaciones explícitas.
