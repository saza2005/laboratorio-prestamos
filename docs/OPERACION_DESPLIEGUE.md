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
- Variables adicionales de Supabase si el entorno las requiere.

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

## Migraciones SQL importantes

Antes de usar el sistema en producción, confirmar que Supabase tenga aplicadas las migraciones de `supabase/migrations`.

Especialmente revisar:

- RPC de creación de solicitudes.
- RPC de aprobación/rechazo de solicitudes.
- RPC de entrega de solicitudes con unidades patrimoniales.
- RPC de entrega parcial de solicitudes aprobadas.
- RPC de préstamos múltiples.
- RPC de devoluciones.
- Políticas RLS de `profiles`, solicitudes, préstamos, devoluciones, inventario y mantenimiento.

Migración crítica reciente:

- `supabase/migrations/20260628_allow_partial_request_delivery.sql`

Esta permite confirmar entregas parciales y crear el préstamo solo con lo realmente entregado.

## Checklist antes de producción

1. Ejecutar `npm run lint`.
2. Ejecutar `npx tsc --noEmit`.
3. Ejecutar `npm run build`.
4. Confirmar OAuth de Google en Supabase.
5. Confirmar dominio permitido `@ucuenca.edu.ec`.
6. Confirmar policies RLS activas.
7. Confirmar funciones RPC disponibles en schema cache.
8. Probar roles: `student`, `teacher`, `lab_staff`, `admin`.
9. Probar flujo completo: solicitud, aprobación, entrega, préstamo, devolución.
10. Probar inventario y mantenimiento.
11. Probar paneles laterales en solicitudes, préstamos, inventario, devoluciones y mantenimiento.
12. Probar confirmaciones de acciones críticas y mensajes de error controlados.
13. Hacer respaldo de base de datos antes de importar o reemplazar inventario.

## Flujo de validación funcional

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
