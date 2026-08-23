# FASE 4 — Preparación de Auth, usuarios y datos E2E

## 1. Estado inicial

- Proyecto: Supabase E2E, ref parcial rwni********wwim.
- Migraciones: 4 alineadas local/remoto.
- Esquema: 19 tablas, 170 columnas, 24 funciones, 45 policies, RLS 19/19, 5 triggers.
- Datos: 0 datos de aplicación.
- ACL: CSV final coincide; cinco legacy authenticated=false; RPC activas authenticated=true.
- Operaciones remotas: ninguna en esta preparación.

## 2. Requisitos de Auth

- Métodos encontrados: contraseña y Google OAuth.
- OAuth: callback valida @ucuenca.edu.ec y crea student si falta profile.
- Restricción institucional: aplicada en OAuth; correos E2E deben ser institucionales de prueba.
- Creación de profiles: callback OAuth manual; no hay trigger real sobre auth.users.
- Middleware: no encontrado en la raíz del worktree; la protección se realiza en páginas/acciones y getAuthProfile.
- Redirects: staff a /dashboard; teacher/student a /solicitudes.

## 3. Usuarios E2E

- Roles: admin, lab_staff, teacher, student.
- Método recomendado: Supabase Admin API desde terminal local, con variables fuera del repositorio; profiles en etapa separada.
- Correos: placeholders exclusivos bajo @ucuenca.edu.ec.
- Contraseñas: placeholders; nunca escritas en archivos versionados ni chat.
- Confirmación: usuarios confirmados para login por contraseña.
- Profiles: UUID igual al Auth user; rol asignado en etapa posterior controlada.

## 4. Datos E2E

- Entidades: perfiles, items bulk/tracked, unidades, solicitudes individuales/grupales, préstamos, devoluciones, mantenimiento y movimientos.
- Escenarios: pending, approved, rejected, préstamo activo, devolución parcial/completa y RLS por rol.
- Dependencias: documentadas mediante alias simbólicos.
- IDs: UUID de Supabase y estado local alias/UUID.
- Etiquetado: prefijo E2E_ en códigos/nombres/notas cuando el campo exista.

## 5. Limpieza

- Estrategia: idempotente, por UUID state y prefijo, con dry-run y confirmación.
- Orden: devoluciones; préstamos; grupos/solicitudes; movimientos/mantenimiento; unidades; items; profiles; Auth.
- Protecciones: Project Ref, --confirm-e2e, conteos, lista UUID y abortar fuera de alcance.
- Riesgo: eliminación destructiva futura; requiere autorización independiente.
- Reversibilidad: conservar estado y separar Auth de la transacción public.

## 6. Variables

- Archivo: .env.e2e.example en la raíz del worktree.
- Variables: URL/anon key/service role key y cuatro pares email/password.
- Gitignore: .env* ya está ignorado por el .gitignore raíz; .env.e2e también queda cubierto.
- Secretos incluidos: ninguno; solo nombres y placeholders.

## 7. Scripts

- Create users: especificado, no implementado.
- Create data: especificado, no implementado.
- Verify: especificado como solo lectura, no implementado.
- Cleanup: especificado, no implementado.
- Ejecutados: ninguno.
- Seguridad: se prefieren especificaciones hasta autorizar y validar el flujo de variables.

## 8. Dashboard

- Configuración necesaria: Email provider, confirmación, Site URL, Redirect URLs y límites.
- Configuración manual: Google provider y callback si se desea OAuth.
- Cambios realizados: ninguno.
- Proyecto normal: no modificado.

## 9. Seguridad

- Proyecto E2E modificado: no.
- Proyecto normal modificado: no.
- Usuarios creados: no.
- Datos creados: no.
- RPC ejecutadas: no.
- Secretos mostrados: no.
- Staging: no.
- Commit: no.

## 10. Conclusión

- Preparación completa: sí.
- Método de creación recomendado: Admin API para Auth, profiles y datos en autorizaciones separadas.
- Listo para configuración manual de Auth: sí.
- Listo para crear usuarios: sí, después de revisar Dashboard y proporcionar variables localmente.
- Listo para crear datos: no todavía; requiere usuarios/perfiles creados y autorización independiente.
- Problemas pendientes: decidir si se probará OAuth real; revisar grants de tablas diferidos antes de escenarios de datos.
- Siguiente paso: checklist manual Auth y luego autorización separada para creación de usuarios.
