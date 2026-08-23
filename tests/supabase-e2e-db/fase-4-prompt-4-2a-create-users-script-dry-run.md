# FASE 4 — Script y dry-run de usuarios Auth

## 1. Entorno

- Proyecto: Supabase E2E (Project Ref enmascarado)
- Project Ref parcialmente oculto: rwni********wwim
- Worktree: /home/saza/Proyectos/laboratorio-prestamos-e2e
- Rama: chore/e2e-supabase-baseline
- Node: disponible; node --check ejecutado correctamente
- Supabase JS: declarado en package.json, no resoluble desde node_modules
- Variables configuradas: todas las variables requeridas presentes, sin mostrar valores
- Secretos mostrados: no

## 2. Archivos

- .env.e2e: existe
- Ignorado: si, por la regla existente para archivos .env*
- Permisos: 600
- Script: scripts/e2e/create-users.mjs
- Estado ignorado: .e2e-state/ ignorado
- Gitignore modificado: si, se anadio unicamente .e2e-state/
- Archivo de estado creado: no

## 3. Validaciones

- URL HTTPS y host Supabase: si
- Project Ref extraido de URL coincide con E2E_EXPECTED_PROJECT_REF: si
- Proyecto enlazado coincide: si
- Correos distintos: si
- Correos con formato institucional @ucuenca.edu.ec: no; la configuracion actual no cumple
- Contrasenas presentes: si
- Contrasenas distintas: no
- Contrasenas de al menos 12 caracteres: no todas
- Errores: corregir las credenciales E2E antes de reintentar

## 4. Script

- Modos: --dry-run y --execute
- Confirmacion E2E: --confirm-e2e obligatoria
- Confirmacion de creacion: E2E_USER_CREATION_CONFIRM=CREATE_E2E_AUTH_USERS en execute
- Idempotencia: conserva usuarios E2E coincidentes y aborta ante conflictos
- Metadata: e2e_test y alias; no asigna roles de aplicacion
- Estado: escritura atomica en .e2e-state/auth-users.json solo durante execute
- Manejo de fallo parcial: persiste cada usuario creado y se detiene sin borrar automaticamente

## 5. Auditoria estatica

- createUser en dry-run: no alcanzable
- updateUser: no
- deleteUser: no
- signIn: no
- signUp: no
- Secretos hardcodeados: 0
- Datos o perfiles: no
- Auditoria: tests/supabase-e2e-db/fase-4-create-users-script-static-audit.md

## 6. Dry-run

- Ejecutado: intento realizado; fallo antes de cualquier llamada Auth
- Codigo de salida: 1
- Usuarios antes: no consultados; la dependencia falto antes de importar el cliente
- e2e_admin: no determinable
- e2e_lab_staff: no determinable
- e2e_teacher: no determinable
- e2e_student: no determinable
- Usuarios despues: no consultados
- Escrituras: 0
- Error: @supabase/supabase-js no esta instalado/resoluble; la validacion local de credenciales tambien requiere correccion
- Salida: tests/supabase-e2e-db/fase-4-create-users-dry-run.txt

## 7. Seguridad

- Proyecto normal modificado: no
- Proyecto E2E modificado: no
- Usuarios creados: no
- Perfiles creados: no
- Datos creados: no
- RPC: no
- Secretos: no mostrados ni escritos
- Staging: no
- Commit: no

## 8. Conclusion

- Script valido: estructura y auditoria estatica correctas; requiere dependencia instalada para ejecutarse
- Dry-run valido: no; bloqueado antes de listUsers()
- Listo para crear usuarios: no
- Requiere autorizacion: instalar @supabase/supabase-js y corregir las cuatro credenciales E2E
- Problemas pendientes: dependencia ausente, dominio de correos incorrecto y contrasenas no conformes
- Siguiente paso: corregir la configuracion local y autorizar la instalacion de la dependencia; luego repetir solo el dry-run
