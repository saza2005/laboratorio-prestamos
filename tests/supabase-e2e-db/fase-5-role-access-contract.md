# FASE 5.1B — Contrato de acceso por rol

| route_or_feature | public | admin | lab_staff | teacher | student | expected_behavior | enforcement_location | source_file | notes |
|---|---|---|---|---|---|---|---|---|---|
| / | ALLOWED | ALLOWED | ALLOWED | ALLOWED | ALLOWED | Página pública | Router público | app/page.tsx | Sin sesión |
| /auth/login | ALLOWED | ALLOWED | ALLOWED | ALLOWED | ALLOWED | Login email/password | Página y Server Action | app/auth/login/page.tsx, app/auth/login/actions.ts | No probar acciones adicionales |
| /auth/register | ALLOWED | ALLOWED | ALLOWED | ALLOWED | ALLOWED | Registro institucional | Página | app/auth/register/page.tsx | Fuera de esta validación |
| /auth/callback | ALLOWED | ALLOWED | ALLOWED | ALLOWED | ALLOWED | Callback OAuth; sin code vuelve a login | Route Handler | app/auth/callback/route.ts | Google no se prueba |
| /dashboard | REDIRECT | ALLOWED | ALLOWED | REDIRECT | REDIRECT | Dashboard operativo | DashboardLayout y página | app/dashboard/layout.tsx, app/dashboard/page.tsx | Home por rol |
| /inventario | REDIRECT | ALLOWED | ALLOWED | REDIRECT | REDIRECT | Gestión de inventario | Page guard y actions | app/inventario/page.tsx, app/inventario/actions.ts | Solo lectura |
| /dashboard/solicitudes | REDIRECT | ALLOWED | ALLOWED | REDIRECT | REDIRECT | Gestión de solicitudes | Page guard y actions | app/dashboard/solicitudes/page.tsx, app/dashboard/solicitudes/actions.ts | Solo lectura |
| /solicitudes | REDIRECT | REDIRECT | REDIRECT | ALLOWED | ALLOWED | Portal de solicitudes | Layout y helpers | app/solicitudes/layout.tsx, app/solicitudes/page.tsx | Teacher/student |
| /solicitudes/mis-solicitudes | REDIRECT | REDIRECT | REDIRECT | ALLOWED | ALLOWED | Solicitudes propias | Página protegida | app/solicitudes/mis-solicitudes/page.tsx | Solo lectura |
| /solicitudes/mis-prestamos | REDIRECT | REDIRECT | REDIRECT | ALLOWED | ALLOWED | Préstamos propios | Portal | app/solicitudes/mis-prestamos/page.tsx | Solo lectura |
| /solicitudes/grupal | REDIRECT | REDIRECT | REDIRECT | ALLOWED | DENIED | Solicitud grupal solo teacher | Page guard | app/solicitudes/grupal/page.tsx, lib/supabase/auth/roles.ts | Student vuelve al portal |
| /solicitudes/catalogo | REDIRECT | REDIRECT | REDIRECT | ALLOWED | ALLOWED | Catálogo | Layout portal | app/solicitudes/catalogo/page.tsx | No enviar solicitud |
| /prestamos | REDIRECT | ALLOWED | ALLOWED | REDIRECT | REDIRECT | Gestión de préstamos | Page guard | app/prestamos/page.tsx | Solo lectura |
| /devoluciones | REDIRECT | ALLOWED | ALLOWED | REDIRECT | REDIRECT | Gestión de devoluciones | Page guard | app/devoluciones/page.tsx | Solo lectura |
| /mantenimiento | REDIRECT | ALLOWED | ALLOWED | REDIRECT | REDIRECT | Gestión de mantenimiento | Page guard | app/mantenimiento/page.tsx | Solo lectura |
| administración de usuarios | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE | No existe ruta identificada | No identificada | app/, lib/ | No inventar ruta |
| logout | NOT_APPLICABLE | ALLOWED | ALLOWED | ALLOWED | ALLOWED | signOut y redirección a login | Server Action | app/dashboard/actions.ts, app/logout-button.tsx | Obligatorio entre cuentas |

Los estados REDIRECT se basan en guards explícitos del código. No se marcan permisos no demostrados como ALLOWED.
