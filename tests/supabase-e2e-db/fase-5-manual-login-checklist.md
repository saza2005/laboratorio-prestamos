# FASE 5.1B — Checklist manual de login, rol y logout

## Reglas comunes

- Usar ventana privada o limpiar completamente localhost:3000.
- Abrir /auth/login.
- Introducir manualmente el correo y contraseña de la cuenta desde .env.e2e; no compartir credenciales.
- Enviar únicamente el formulario de login.
- Verificar redirección, profile y rol.
- Abrir solo rutas de lectura permitidas y una ruta restringida.
- No pulsar crear, aprobar, rechazar, entregar, devolver ni mantenimiento.
- Cerrar sesión mediante la interfaz y verificar que el dashboard deja de ser accesible.
- Cerrar la ventana antes del siguiente rol.

## Admin

1. Login manual con las variables de admin.
2. Esperado: /dashboard.
3. Verificar profile y rol admin.
4. Leer /dashboard, /inventario, /prestamos, /devoluciones, /mantenimiento y /dashboard/solicitudes.
5. Comprobar /solicitudes como restringida/redirigida.
6. No ejecutar escrituras.
7. Logout y verificar sesión eliminada.

## Lab staff

1. Login manual con las variables de lab staff.
2. Esperado: /dashboard.
3. Verificar profile y rol lab_staff.
4. Leer /dashboard, /inventario, /prestamos, /devoluciones, /mantenimiento y /dashboard/solicitudes.
5. Comprobar /solicitudes como restringida/redirigida.
6. No ejecutar escrituras.
7. Logout y verificar sesión eliminada.

## Teacher

1. Login manual con las variables de teacher.
2. Esperado: /solicitudes.
3. Verificar profile y rol teacher.
4. Leer /solicitudes, /solicitudes/catalogo, /solicitudes/mis-solicitudes, /solicitudes/mis-prestamos y /solicitudes/grupal.
5. Comprobar /dashboard como restringida/redirigida.
6. No crear solicitudes.
7. Logout y verificar sesión eliminada.

## Student

1. Login manual con las variables de student.
2. Esperado: /solicitudes.
3. Verificar profile y rol student.
4. Leer /solicitudes, /solicitudes/catalogo, /solicitudes/mis-solicitudes y /solicitudes/mis-prestamos.
5. Comprobar /solicitudes/grupal y /dashboard como restringidas/redirigidas.
6. No crear solicitudes.
7. Logout y verificar sesión eliminada.

Registrar solo PASS/FAIL, ruta y mensaje categorizado. No registrar correos, UUID, cookies, tokens ni HTML completo.
