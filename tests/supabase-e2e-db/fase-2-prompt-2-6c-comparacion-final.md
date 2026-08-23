# FASE 2 — Comparación final de permisos

## 1. Archivos

- CSV locales: 5 archivos revisados y 4 CSV comparativos generados.
- CSV remotos: 4 archivos revisados.
- Válidos: sí; todos tienen encabezados, filas lógicas completas y no contienen mensajes de ejecución.
- Problemas: los CSV remotos usan booleanos `true/false` y CRLF; se normalizaron frente a los valores locales `t/f`. Las expresiones multilínea de policies se conservaron.

## 2. Funciones

- Total: 24
- Iguales en identidad: 24
- Diferentes en permisos/ACL: 21; las diferencias principales son `anon=true` y ACL remoto para esas funciones.
- anon local: 0
- anon E2E: 21
- Mutacionales expuestas: 13
- Helpers expuestos: 3 (`ensure_google_institutional_profile`, `handle_new_user`, `set_updated_at`)
- Lecturas/helpers expuestas: 5 (`get_dashboard_inventory_summary`, `get_dashboard_operational_summary`, `get_my_role`, `is_admin_or_lab_staff`, `is_teacher`)

Las tres RPC endurecidas no aparecen entre las 21 diferencias de anon y mantienen `anon=false` en E2E.

## 3. Default ACL

- Diferencias: no hay diferencias dentro del esquema `public`; las 48 entradas solo locales corresponden al esquema local `supabase_functions`.
- Origen de grants remotos: el default ACL de `public` confirma `EXECUTE` para `anon` y `authenticated` sobre futuras funciones en ambos entornos. Además, las funciones existentes tienen ACL de objeto que debe endurecerse individualmente.
- Defaults peligrosos: sí, `anon` recibe EXECUTE por defecto para futuras funciones `public`.
- Cambios recomendados: revocar el default `EXECUTE` para `anon` bajo el propietario real `supabase_admin`; esto no revoca permisos de funciones existentes, por lo que se requieren revocaciones explícitas.

Modificar un default ACL no corrige retroactivamente las funciones ya creadas.

## 4. Tablas

- Diferencias: 9 combinaciones tabla/rol.
- Grants anon: las 19 tablas tienen privilegios SQL efectivos para anon en E2E; el diff relevante afecta staging, `loan_group_items`, `loan_groups` y `maintenance_records`.
- Acceso efectivo mediante policies: 0 tablas permiten filas a anon; RLS está habilitado y las policies comparadas son para `authenticated`.
- Staging: los tres grupos de staging no tienen uso confirmado en la aplicación actual; sus grants authenticated requieren decisión separada.
- Cambios recomendados: no hacer revocaciones masivas. Revisar y eventualmente revocar anon en tablas concretas, preservando authenticated solo si se confirma un flujo de importación.

## 5. Policies

- Coincidentes: 45
- Faltantes: 0
- Adicionales: 0
- Policies con acceso anon: 0
- Riesgos: los grants SQL anon son innecesarios aunque RLS bloquee filas; una policy futura para anon podría convertirlos en acceso efectivo.

## 6. Clasificación

- SAFE_REQUIRED: permisos authenticated/service_role necesarios para flujos de aplicación y protegidos por validaciones/RLS.
- SAFE_RLS_BLOCKED: 19 combinaciones de tablas con privilegios anon pero RLS sin policies anon aplicables.
- UNNECESSARY_GRANT: helpers, trigger y tablas staging sin uso confirmado.
- LEGACY_EXPOSURE: staging y helpers anon no usados por el flujo actual.
- MUTATIONAL_ANON_EXPOSURE: 13 funciones mutacionales con `anon=true` en E2E.
- REQUIRES_MANUAL_DECISION: grants authenticated de staging y cualquier permiso que se quiera conservar por compatibilidad con importaciones futuras.

## 7. Migración correctiva

- Requerida: sí, si se desea que E2E y el esquema local tengan el mismo hardening y evitar futuras exposiciones.
- Funciones afectadas: 21 funciones con anon; 13 mutacionales y 8 helpers/lecturas.
- Tablas afectadas: revisar grants anon de tablas concretas; no se propone todavía revocación automática.
- Default ACL afectado: `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon`.
- Archivo de propuesta: `fase-2-propuesta-hardening-completo.sql.review`
- SQL ejecutado: ninguno

La propuesta contiene revocaciones explícitas para `PUBLIC` y `anon` en las 21 funciones, conserva sin tocar `authenticated` y `service_role`, y revoca el default ACL de futuras funciones. No es una migración ejecutable todavía.

## 8. Riesgos

- Críticos: ninguno demostrado como explotación ejecutada.
- Altos: 13 funciones mutacionales ejecutables por anon en E2E.
- Medios: default ACL de funciones para anon y grants anon de tablas bajo RLS.
- Bajos: helpers/trigger y staging sin uso confirmado.

## 9. Evaluación

- FASE 2 puede cerrarse sin cambios: no
- Se necesita tercera migración: sí, para hardening explícito, después de revisar la propuesta.
- Proyecto E2E seguro para FASE 3: no todavía; requiere aplicar y validar el hardening antes de iniciar pruebas E2E.
- Justificación: el esquema y policies están alineados, pero E2E conserva exposición de funciones anon que el entorno local no tiene.

## 10. Siguiente paso

- Acción: revisar el archivo `.sql.review`, decidir si se revocan también los grants anon de tablas y confirmar el flujo de staging.
- Requiere autorización: sí, para crear una tercera migración, reset local y aplicar cambios remotos.
- Acciones prohibidas: ejecutar el `.review`, crear una migración ejecutable, `db push`, `migration repair`, SQL remoto de escritura o RPC.
