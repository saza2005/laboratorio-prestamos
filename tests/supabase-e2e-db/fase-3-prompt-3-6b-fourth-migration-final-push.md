# FASE 3 — Push final de la cuarta migración

## 1. Identidad

- Proyecto: Supabase E2E
- Project Ref parcialmente oculto: rwni********wwim
- Coincide con E2E: sí
- Coincide con proyecto normal: no
- Rama: chore/e2e-supabase-baseline

## 2. Integridad

- Migración: 20260806154909_revoke_authenticated_legacy_rpcs.sql
- SHA-256: 1286760da7ba8a7f35f50c3d111876f6de86df74f8c7c4f1c77967adfc8d4ba3
- Archivos SQL: 4
- Migraciones modificadas: no

## 3. Estado previo

- Versiones locales: 20260805220647, 20260805223410, 20260806001035, 20260806154909
- Versiones remotas: 20260805220647, 20260805223410, 20260806001035
- Dry-run: exitoso, código 0
- Migraciones propuestas: únicamente 20260806154909_revoke_authenticated_legacy_rpcs.sql
- EAUTHQUERY: no reapareció

## 4. Push real

- Ejecutado: sí
- Resultado: exitoso
- Código de salida: 0
- Migración aplicada: 20260806154909_revoke_authenticated_legacy_rpcs.sql
- Error: ninguno
- SQLSTATE: ninguno
- Advertencias: ninguna

## 5. Historial posterior

- Versiones locales: las cuatro migraciones
- Versiones remotas: las cuatro migraciones
- Alineación: sí
- Versiones adicionales: ninguna

## 6. ACL

- Cinco legacy: el diff posterior no muestra grants authenticated pendientes; queda disponible consulta catalogada para verificación directa.
- PUBLIC: sin grants legacy pendientes según diff; el estado esperado es false.
- anon: sin grants legacy pendientes según diff; el estado esperado es false.
- authenticated: revocaciones aplicadas; el estado esperado de las cinco legacy es false.
- service_role: no afectado por la migración; el estado esperado es true.
- RPC activas: el diff no muestra cambios sobre sus grants; deben conservar authenticated=true y service_role=true.
- Diferencias: ninguna de funciones; solo permanecen grants de tablas conocidos.
- Consulta de verificación: fase-3-e2e-legacy-active-rpc-permissions-after-push.sql, exclusivamente de lectura y no ejecutada por Codex.

## 7. Diff posterior

- Ejecutado: sí, código 0
- Grants legacy presentes: no
- Diferencias estructurales: no
- Diferencias de seguridad de funciones: no
- Excepciones conocidas: grants de tablas staging y tablas operativas previamente diferidos.

## 8. Regresión

- Tablas: 19
- Columnas: 170
- Restricciones: PK 18; FK 32; UNIQUE 6; CHECK 19
- Índices: 48
- Enums: 7; valores enum 33
- Funciones: 24
- Policies: 45
- RLS: 19/19
- Triggers: 5
- Datos: 0

## 9. Seguridad

- Proyecto normal modificado: no
- Proyecto E2E modificado: sí, únicamente mediante la cuarta migración autorizada
- Operaciones remotas: migration list, dry-run, push autorizado y diff de lectura
- migration repair: no
- db reset --linked: no
- RPC: no ejecutadas
- Secretos: no mostrados
- Staging: no
- Commit: no

## 10. Conclusión

- Push exitoso: sí
- Equivalencia estructural: sí
- Equivalencia de permisos: sí para las funciones, inferida por historial y diff; queda consulta catalogada disponible para confirmación directa.
- Diferencias bloqueantes: no; persisten únicamente excepciones de grants de tablas documentadas.
- FASE 3.2/3.3 cerradas: sí
- Proyecto E2E listo para usuarios y datos: sí para iniciar la preparación controlada; no se han creado usuarios ni datos.
- Problemas pendientes: revisar posteriormente grants de tablas y ejecutar la consulta ACL antes de crear usuarios.
- Siguiente paso: preparar la FASE 4 de usuarios y datos de prueba, sin ejecutarla todavía.
