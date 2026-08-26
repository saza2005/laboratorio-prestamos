# Operación y despliegue

## Requisitos

- Node.js compatible con Next.js 16.
- Proyecto Supabase configurado.
- Variables de entorno en `.env.local` para desarrollo y en Vercel para producción.
- Políticas RLS y funciones RPC aplicadas en Supabase.

## Variables de entorno

No guardar valores reales en Git.

Variables esperadas:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (solo servidor; nunca exponer al navegador).
- `DATABASE_URL` (solo tareas administrativas controladas).
- `NEXT_PUBLIC_APP_URL` (URL pública exacta, sin barra final).
- `RESEND_API_KEY` y `EMAIL_FROM` si se habilitan notificaciones por correo.

En producción, `NEXT_PUBLIC_APP_URL` no puede conservar `localhost`. Debe coincidir
con el dominio canónico desplegado.

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

El baseline contiene el modelo y las funciones de negocio acumuladas, incluida la
entrega parcial. Los archivos de `supabase/legacy-migrations` son evidencia
histórica y no deben volver a aplicarse sobre el baseline.

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

Flujo recomendado:

```bash
git status
git add .
git commit -m "Mensaje descriptivo"
git push
```

Después del push, revisar el despliegue de Vercel y probar las rutas principales.

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
