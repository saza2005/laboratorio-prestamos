# FASE 2 — Grants de tablas diferidos

- Las 19 tablas tienen RLS habilitado.
- Los grants de tablas no se modifican en la tercera migración.
- RLS bloquea el acceso efectivo a filas de anon porque no existen policies para anon, pero RLS no sustituye la revisión de privilegios SQL.
- Las tablas staging requieren una decisión funcional separada.
- La revisión de grants de tablas continuará en FASE 3 o en una migración independiente.
- No se ejecutaron cambios de permisos de tablas.
