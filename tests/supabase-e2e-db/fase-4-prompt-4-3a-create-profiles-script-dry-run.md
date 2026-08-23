# FASE 4 — Script y dry-run de perfiles E2E

## 1. Entorno

- Proyecto: Supabase E2E
- Project Ref parcialmente oculto: rwni********wwim
- Rama: chore/e2e-supabase-baseline
- Usuarios Auth: 4 verificados por listUsers
- Archivo Auth state: valido, cuatro alias y UUID distintos
- Dependencias modificadas: no

## 2. Contrato de profiles

- Columnas: id, full_name, email, role, career, is_active, created_at, updated_at
- PK: profiles_pkey sobre id
- FK: profiles_id_fkey hacia auth.users(id), ON DELETE CASCADE
- Enum: public.user_role
- Roles: admin, lab_staff, teacher, student
- Campos obligatorios: id, full_name, email, role
- Defaults: role student; is_active true; created_at y updated_at now()
- Creacion automatica: no existe trigger activo sobre auth.users; OAuth tiene un insert separado
- Campos utilizados por la aplicacion: id, full_name, email y role

## 3. Payload

- e2e_admin: id Auth, full_name E2E Admin, email Auth, role admin
- e2e_lab_staff: id Auth, full_name E2E Laboratory Staff, email Auth, role lab_staff
- e2e_teacher: id Auth, full_name E2E Teacher, email Auth, role teacher
- e2e_student: id Auth, full_name E2E Student, email Auth, role student
- Campos inventados: ninguno
- Campos faltantes: ninguno; defaults usados para career, is_active, created_at y updated_at

## 4. Script

- Ruta: scripts/e2e/create-profiles.mjs
- Modos: --dry-run y --execute
- Confirmacion E2E: --confirm-e2e
- Confirmacion execute: E2E_PROFILE_CREATION_CONFIRM=CREATE_E2E_PROFILES
- Idempotencia: conserva coincidencias exactas y aborta ante conflictos
- Upsert: no utilizado
- Archivo de estado: .e2e-state/profiles.json solo en execute, escritura atomica
- Manejo de conflictos: detiene sin actualizar ni eliminar

## 5. Auditoria estatica

- Insert en dry-run: no
- Update: no
- Delete: no
- Upsert: no
- RPC: no
- Auth writes: no
- Secretos hardcodeados: 0
- Consulta limitada: si, por los cuatro UUID Auth
- Auditoria: fase-4-create-profiles-script-static-audit.md

## 6. Dry-run

- Ejecutado: si
- Intentos: 1
- Codigo de salida: 0
- Usuarios Auth verificados: 4/4, UUID, correo, confirmacion y metadata E2E coincidentes
- Perfiles antes: 0
- e2e_admin: WOULD_CREATE
- e2e_lab_staff: WOULD_CREATE
- e2e_teacher: WOULD_CREATE
- e2e_student: WOULD_CREATE
- Perfiles despues: 0
- Escrituras: 0
- Error: ninguno
- Salida: fase-4-create-profiles-dry-run.txt

## 7. Seguridad

- Proyecto normal modificado: no
- Proyecto E2E remoto modificado: no
- Usuarios Auth modificados: no
- Perfiles creados: no
- Datos creados: no
- Archivo profiles state: no creado
- Secretos: no mostrados
- Staging: no
- Commit: no

## 8. Conclusion

- Contrato determinado: si
- Payload completo: si
- Script valido: si
- Dry-run valido: si
- Conflictos: ninguno
- Listo para crear perfiles: si, pendiente de autorizacion independiente para execute
- Requiere autorizacion: si
- Siguiente paso: autorizar por separado la insercion de perfiles; no crear datos en esta tarea
