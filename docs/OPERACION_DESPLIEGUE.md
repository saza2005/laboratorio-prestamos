# Operación y despliegue

## Requisitos

- Node.js compatible con Next.js 16.
- Proyecto Supabase configurado.
- Variables de entorno en `.env.local` para desarrollo y en Vercel para producción.
- Políticas RLS y funciones RPC aplicadas en Supabase.

## Variables de entorno

La rotación segura de credenciales se encuentra en `ROTACION_SECRETOS.md`.

No guardar valores reales en Git.

Variables esperadas:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL` (solo tareas administrativas controladas).
- `NEXT_PUBLIC_APP_URL` (URL pública exacta, sin barra final).
- `RESEND_API_KEY` y `EMAIL_FROM` si se habilitan notificaciones por correo.

El runtime actual no requiere `SUPABASE_SERVICE_ROLE_KEY`. No debe añadirse a
Vercel ni al entorno local salvo que una futura herramienta administrativa,
aislada y revisada demuestre esa necesidad.

En producción, `NEXT_PUBLIC_APP_URL` no puede conservar `localhost`. Debe coincidir
con el dominio canónico desplegado.

Las redirecciones OAuth utilizan esta URL canónica en lugar de confiar en el
encabezado `Origin`. El callback solo acepta destinos internos previstos por la
aplicación (`/dashboard` y `/solicitudes`).

En el acceso de cuentas existentes, el correo se normaliza para comparación,
pero la contraseña se envía exactamente como fue escrita. No se deben recortar
ni transformar contraseñas antes de entregarlas a Supabase Auth.

## OAuth de Google

La aplicación restringe el acceso nuevo a cuentas institucionales
`@ucuenca.edu.ec` tanto en la solicitud a Google como al procesar el callback.

Configuración que debe verificarse manualmente antes de publicar:

1. En **Supabase > Authentication > URL Configuration**:
   - `Site URL`: `https://<dominio-produccion>`.
   - `Redirect URLs`: `https://<dominio-produccion>/auth/callback`.
   - Mantener `http://localhost:3000/auth/callback` únicamente para desarrollo.
2. En **Supabase > Authentication > Providers > Google**:
   - proveedor habilitado;
   - Client ID y Client Secret vigentes.
3. En **Google Cloud > OAuth client**:
   - origen JavaScript autorizado: `https://<dominio-produccion>`;
   - URI de redirección autorizada: la URL de callback de Supabase mostrada por
     el panel del proveedor Google, con forma
     `https://<proyecto>.supabase.co/auth/v1/callback`.

No se deben colocar secretos OAuth en variables `NEXT_PUBLIC_*` ni en Git.

## Comandos locales

```bash
npm run dev
npm run lint
npx tsc --noEmit
npm run build
```

Para levantar el servidor local de forma controlada:

```bash
NODE_OPTIONS="--max-old-space-size=1024" npm run dev
```

## Migraciones SQL canónicas

Antes de usar el sistema en producción, confirmar que Supabase tenga aplicadas las migraciones de `supabase/migrations`.

El linaje activo consta de:

- `20260805220647_baseline_public_schema.sql`
- `20260805223410_harden_anon_rpc_execute.sql`
- `20260806001035_harden_all_anon_function_execute.sql`
- `20260806154909_revoke_authenticated_legacy_rpcs.sql`
- `20260823_admin_update_profile_role.sql`
- `20260826174000_harden_default_privileges.sql`

El baseline contiene el modelo y las funciones de negocio acumuladas, incluida la
entrega parcial. Los archivos de `supabase/legacy-migrations` son evidencia
histórica y no deben volver a aplicarse sobre el baseline.

La última migración revoca privilegios automáticos de `anon` y `authenticated`
para tablas, secuencias y funciones que se creen en el futuro. No cambia grants
ni policies actuales: obliga a que cada nuevo objeto declare explícitamente el
acceso que necesita.

Antes de un `supabase db push`, consultar `supabase migration list`. Si el
baseline aparece pendiente sobre una base que ya contiene tablas del sistema,
detenerse y reconciliar el historial; no intentar aplicarlo encima.

## Checklist antes de producción

1. Ejecutar `npm run lint`.
2. Ejecutar `npx tsc --noEmit`.
3. Ejecutar `npm run build`.
4. Confirmar dominio, variables y OAuth de Google con la lista anterior.
5. Confirmar dominio permitido `@ucuenca.edu.ec`.
6. Confirmar policies RLS activas.
7. Confirmar funciones RPC disponibles en schema cache.
8. Probar roles: `student`, `teacher`, `lab_staff`, `admin`.
9. Probar flujo completo: solicitud, aprobación, entrega, préstamo, devolución.
10. Probar inventario y mantenimiento.
11. Probar paneles laterales en solicitudes, préstamos, inventario, devoluciones y mantenimiento.
12. Probar confirmaciones de acciones críticas y mensajes de error controlados.
13. Hacer respaldo de base de datos antes de importar o reemplazar inventario.
14. Confirmar acceso de `admin` y `lab_staff` a Analítica y exportación Excel.
15. Confirmar que `teacher` y `student` no acceden a rutas administrativas.

## Flujo de validación funcional

Checklist detallada:

- `docs/PRUEBAS_FUNCIONALES.md`

### Student

- Iniciar sesión con Google institucional.
- Crear solicitud individual.
- Revisar `Mis solicitudes`.
- Revisar `Mis préstamos`.

### Teacher

- Crear solicitud individual.
- Crear solicitud grupal.
- Agregar y quitar materiales.
- Revisar solicitudes y préstamos.

### Lab staff / Admin

- Aprobar y rechazar solicitudes.
- Entregar solicitud completa.
- Entregar solicitud parcial.
- Registrar préstamo directo con varios ítems.
- Registrar devolución parcial y total.
- Registrar mantenimiento de equipo y trabajo general.
- Revisar inventario, unidades y movimientos.

## Git y despliegue

La rama `main` está protegida. El flujo normal es:

```bash
git status
git add .
git commit -m "Mensaje descriptivo"
git push -u origin <rama>
```

Después se debe abrir una pull request. GitHub exige que la rama esté actualizada,
que CI y CodeQL finalicen correctamente y que todas las conversaciones estén
resueltas. La integración mantiene historial lineal y no permite force-push ni
eliminación de `main`.

El administrador conserva bypass para una emergencia operativa, no para el flujo
cotidiano. Si se utiliza, debe documentar el motivo y validar inmediatamente el
commit resultante.

Después del merge, revisar el despliegue de Vercel y probar las rutas principales.

GitHub Actions también ejecuta CodeQL sobre JavaScript y TypeScript en pushes a
`main`, pull requests y una programación semanal. Sus alertas deben revisarse en
**Security > Code scanning**; no deben silenciarse sin documentar por qué el
hallazgo no es explotable o cómo quedó mitigado.

En **Security** también permanecen habilitados Dependabot Alerts, Dependabot
Security Updates y Secret Scanning con Push Protection. Las pull requests de
seguridad deben pasar CI y revisión funcional antes de integrarse; no se usa
merge automático.

## Rutas principales para prueba

- `/`
- `/auth/login`
- `/dashboard`
- `/dashboard/solicitudes`
- `/inventario`
- `/prestamos`
- `/devoluciones`
- `/mantenimiento`
- `/solicitudes`
- `/solicitudes/nueva`
- `/solicitudes/grupal`
- `/solicitudes/mis-solicitudes`
- `/solicitudes/mis-prestamos`

## Riesgos operativos

- Si una RPC no está aplicada, las acciones pueden fallar aunque el frontend compile. El sistema mostrará un mensaje de función faltante o schema cache para orientar la revisión.
- Si RLS está mal configurado, un rol puede ver menos o más información de la debida.
- Si se reemplaza inventario real, hacer respaldo primero.
- Si se elimina un usuario con historial, revisar relaciones antes de borrar datos.
- Si una entrega parcial queda mal registrada, revisar `requests`, `request_items`, `loans`, `loan_items` e `inventory_movements`.

## Cabeceras de seguridad

Next aplica en todas las rutas las siguientes defensas compatibles con la
arquitectura actual:

- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: DENY`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `Permissions-Policy` sin cámara, micrófono, geolocalización ni Topics API;
- ocultamiento de `X-Powered-By`.

Vercel añade HSTS en producción. Una Content Security Policy estricta queda para
una activación posterior. Actualmente se emite como
`Content-Security-Policy-Report-Only` para observar compatibilidad con Next,
Supabase y Google OAuth sin bloquear usuarios. `connect-src` se deriva de
`NEXT_PUBLIC_SUPABASE_URL`; una URL ausente o inválida no amplía permisos y deja
únicamente el mismo origen.

La portada y `/auth/login` también reciben `Content-Security-Policy` en modo de
bloqueo porque su smoke de navegador no presenta violaciones. El resto de las
rutas permanece únicamente en `Report-Only` hasta contar con sesiones E2E
vigentes para validar superficies autenticadas.

Antes de cambiarla a modo de bloqueo se deben revisar violaciones reales en
producción y probar al menos login Google, dashboard, formularios, gráficos y
exportación. No se debe eliminar una directiva para silenciar un error sin
identificar primero el recurso y su necesidad.

## Monitoreo de producción

GitHub Actions ejecuta cada seis horas el workflow `Production health`. La
comprobación es pública y de solo lectura:

- portada disponible;
- pantalla de inicio de sesión disponible;
- callback OAuth sin código redirige al error controlado esperado.

También puede ejecutarse manualmente desde GitHub Actions o localmente:

```bash
PRODUCTION_URL="https://laboratorio-prestamos.vercel.app" npm run check:production
```

Este smoke no inicia sesión, no llama RPC de negocio y no modifica Supabase.

La estación operativa también puede ejecutar este smoke cada seis horas y
reutilizar las alertas locales ante fallos. Las unidades correspondientes son
`laboratorio-prestamos-production-health.service` y
`laboratorio-prestamos-production-health.timer`:

```bash
cp ops/systemd/laboratorio-prestamos-production-health.* ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now laboratorio-prestamos-production-health.timer
```

La comprobación solo consulta la portada, el inicio de sesión y el callback
OAuth público. No crea sesiones ni modifica datos.

## Respaldos

El repositorio incluye un respaldo complementario del esquema y los datos
`public`, además de los datos de `auth`. El comando genera archivos SQL con
permisos privados y un manifiesto SHA-256:

```bash
node --env-file=.env.local --env-file=.env.backup npm run backup:database
```

El archivo local `.env.backup` debe contener únicamente una ruta absoluta fuera
del repositorio:

```text
DATABASE_BACKUP_DIR=/ruta/privada/de/respaldos
```

Este respaldo contiene información operativa, perfiles e información sensible
de autenticación, por lo que no debe subirse a Git, sincronizarse a una carpeta
pública ni compartirse sin cifrado.

Los datos de `auth` deben restaurarse mediante un procedimiento controlado y no
deben importarse directamente sobre un proyecto activo sin una revisión previa.
Si el plan de Supabase ofrece backups administrados, estos siguen siendo la
opción preferida porque cubren la recuperación coordinada de la plataforma.

En la estación operativa se puede habilitar el timer de usuario incluido en
`ops/systemd`. Ejecuta un respaldo diario alrededor de las 02:30 y, gracias a
`Persistent=true`, recupera una ejecución pendiente cuando el equipo vuelve a
encenderse. Su estado se consulta con:

```bash
systemctl --user status laboratorio-prestamos-backup.timer
systemctl --user list-timers laboratorio-prestamos-backup.timer
```

Cada ejecución verifica automáticamente que los archivos existan, no estén
vacíos y coincidan con los hashes SHA-256 del manifiesto. Un respaldo existente
también puede comprobarse sin conectarse a Supabase:

```bash
npm run backup:verify -- /ruta/privada/de/respaldos/<respaldo>
```

Actualmente los respaldos residen en el mismo disco del equipo. Para cubrir la
pérdida física del equipo falta elegir un destino externo y cifrar los archivos
antes de transferirlos. No debe sincronizarse `auth-data.sql` sin cifrado.

### Copia cifrada en memoria USB

La tarea diaria puede copiar el respaldo más reciente a una memoria externa.
La copia se empaqueta y cifra con GPG/AES-256, se valida mediante descifrado y
se acompaña de un checksum SHA-256. Si la memoria no está conectada, el respaldo
local sigue completándose y la exportación externa queda registrada como omitida
sin borrar el respaldo local. Si la memoria está disponible pero falla el
cifrado, la escritura o la verificación, el servicio termina con error y activa
la alerta operativa.

La contraseña se almacena fuera del repositorio en:

```text
~/.config/laboratorio-prestamos/backup-passphrase
```

Ese archivo debe contener una contraseña larga, tener permisos `600` y nunca
copiarse junto al respaldo cifrado. Es indispensable conservar la contraseña en
un gestor de contraseñas independiente: sin ella no se puede restaurar la copia.
La configuración inicial abre dos diálogos protegidos para crearla y confirmarla:

```bash
npm run backup:setup-encryption
```

Para comprobar una copia cifrada sin restaurarla en ninguna base de datos:

```bash
BACKUP_PASSPHRASE_FILE="$HOME/.config/laboratorio-prestamos/backup-passphrase" \
  npm run backup:verify-encrypted -- "/ruta/al/respaldo.tar.gpg"
```

La prueba descifra en un directorio temporal privado, rechaza rutas inseguras,
verifica el manifiesto y elimina inmediatamente los archivos temporales. No
ejecuta SQL ni se conecta a Supabase.

### Verificación mensual automática de recuperación

Los units `laboratorio-prestamos-recovery-check.service` y
`laboratorio-prestamos-recovery-check.timer` ejecutan mensualmente la misma
prueba segura sobre la copia cifrada más reciente. Además de validar cifrado,
archivo y manifiesto, rechazan una copia con más de 35 días. La tarea nunca
importa SQL ni modifica Supabase.

Para habilitarla en la estación operativa:

```bash
cp ops/systemd/laboratorio-prestamos-recovery-check.* ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now laboratorio-prestamos-recovery-check.timer
```

El chequeo también puede ejecutarse manualmente cuando la memoria esté
conectada:

```bash
EXTERNAL_BACKUP_DIR="/ruta/externa/laboratorio-prestamos" \
BACKUP_PASSPHRASE_FILE="$HOME/.config/laboratorio-prestamos/backup-passphrase" \
  npm run backup:verify-latest-encrypted
```

### Alertas locales de operación

Los servicios de respaldo diario y verificación mensual activan
`laboratorio-prestamos-operational-alert.service` cuando terminan con error. La
alerta queda registrada de forma persistente y privada en:

```text
~/.local/state/laboratorio-prestamos/operational-alerts.log
```

Si la sesión gráfica admite `notify-send`, también aparece una notificación de
escritorio. El registro no contiene credenciales ni datos respaldados. Para
instalar o actualizar las unidades:

```bash
cp ops/systemd/laboratorio-prestamos-*.service ~/.config/systemd/user/
cp ops/systemd/laboratorio-prestamos-*.timer ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now laboratorio-prestamos-backup.timer
systemctl --user enable --now laboratorio-prestamos-recovery-check.timer
```

### Revisión de conservación y espacio

La política inicial conserva todas las copias y evita borrados automáticos. El
timer `laboratorio-prestamos-backup-storage-audit.timer` revisa semanalmente la
cantidad y el tamaño de respaldos locales y externos. Al superar 90 copias en un
destino, genera una alerta para revisar la conservación de forma manual; nunca
elimina archivos.

```bash
cp ops/systemd/laboratorio-prestamos-backup-storage-audit.* ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now laboratorio-prestamos-backup-storage-audit.timer
```

También puede consultarse sin cambiar nada:

```bash
DATABASE_BACKUP_DIR="$HOME/Respaldos/laboratorio-prestamos" \
EXTERNAL_BACKUP_DIR="/ruta/externa/laboratorio-prestamos" \
  npm run backup:audit-storage
```


## Validación de interfaz

Después de cambios visuales, revisar en escritorio y móvil:

- apertura y cierre de paneles laterales;
- cierre con `Esc`;
- bloqueo de scroll del fondo mientras el panel está abierto;
- navegación con `Tab` dentro del panel;
- confirmaciones antes de acciones críticas;
- mensajes de error en formularios.

## Mensajes de error

Las Server Actions usan un helper común para traducir errores técnicos frecuentes de Supabase/RPC a mensajes entendibles. Si aparece un mensaje técnico nuevo, revisar `lib/action-error.ts` y agregar una regla conservadora sin ocultar información útil como stock insuficiente o permisos insuficientes.
