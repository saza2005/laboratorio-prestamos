# FASE 3 — Push de la cuarta migración

## 1. Identidad

- Proyecto: Supabase E2E
- Project Ref parcialmente oculto: rwni********wwim
- Coincide con E2E: sí
- Coincide con proyecto normal: no
- Rama: chore/e2e-supabase-baseline
- Directorio: tests/supabase-e2e-db

## 2. Integridad

- Migración: 20260806154909_revoke_authenticated_legacy_rpcs.sql
- SHA-256: 1286760da7ba8a7f35f50c3d111876f6de86df74f8c7c4f1c77967adfc8d4ba3
- Archivos SQL: 4
- Migraciones modificadas: no

## 3. Estado previo

- Versiones locales: 20260805220647, 20260805223410, 20260806001035, 20260806154909
- Versiones remotas: 20260805220647, 20260805223410, 20260806001035
- Dry-run repetido: fallido por timeout de autenticación remota
- Migraciones propuestas: no determinable en esta ejecución
- Archivos inesperados: ninguno

## 4. Push real

- Comando: no ejecutado
- Resultado: detenido antes del push
- Código de salida del dry-run: 1
- Migración aplicada: ninguna en esta ejecución
- Error: LegacyDbConnectError; EAUTHQUERY auth_query secret check timed out
- SQLSTATE: XX000
- Advertencias: no repetir automáticamente; verificar disponibilidad del servicio antes de reintentar

## 5. Historial posterior

- Versiones locales: las cuatro locales
- Versiones remotas: las tres primeras, según la consulta previa al dry-run
- Alineación: cuarta migración continúa pendiente; no se ejecutó push
- Versiones adicionales: ninguna observada

## 6. ACL de funciones

- Cinco legacy: no verificadas remotamente en esta ejecución
- PUBLIC: no verificado remotamente después del intento
- anon: no verificado remotamente después del intento
- authenticated: no verificado remotamente después del intento
- service_role: no verificado remotamente después del intento
- RPC activas: no verificadas remotamente en esta ejecución
- Diferencias inesperadas: no determinables sin conexión estable

## 7. Diff posterior

- Ejecutado: no
- Cinco grants legacy todavía presentes: no determinable
- Diferencias estructurales: no determinables
- Diferencias de seguridad: no determinables
- Grants de tablas diferidos: permanecen documentados
- Excepciones conocidas: default ACL de plataforma y grants de tablas diferidos

## 8. Regresión

- No se ejecutaron cambios remotos; no hay regresión causada por esta ejecución.
- Datos: no modificados

## 9. Seguridad

- Proyecto normal modificado: no
- Proyecto E2E modificado: no confirmado; el push no se ejecutó
- Operaciones remotas: consultas de historial y dry-run; cero escrituras
- db reset --linked: no
- migration repair: no
- RPC: no ejecutadas
- Secretos: no mostrados
- Staging: no
- Commit: no

## 10. Conclusión

- Push exitoso: no; no iniciado
- Equivalencia de permisos: pendiente de aplicar y verificar la cuarta migración
- Diferencias bloqueantes: conectividad/autenticación del servicio remoto; no se debe repetir automáticamente
- FASE 3.2/3.3 cerradas: la validación local está cerrada; la aplicación remota queda pendiente
- Proyecto E2E listo para datos: no determinable y no debe iniciarse FASE 4
- Problemas pendientes: resolver el timeout EAUTHQUERY y repetir primero el dry-run, con nueva autorización si corresponde
- Siguiente paso: revisar disponibilidad/autenticación de Supabase; no ejecutar push ni migration repair ahora.
