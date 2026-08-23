# FASE 4 — Estrategia de IDs

- Auth: UUID generado por Supabase Admin API; nunca reutilizar IDs del proyecto normal.
- profiles: exactamente el UUID devuelto por Auth.
- public: UUID por defecto de la base; resolver dependencias por alias en estado local ignorado.
- Códigos únicos: prefijo E2E_ y sufijo estable por alias.
- Idempotencia: lookup por correo/código, validar marca E2E antes de actualizar.
- Guardar solo alias, UUID y Project Ref parcial; nunca claves ni contraseñas.
- Limpieza por UUIDs del estado y prefijo; no por nombres amplios.
