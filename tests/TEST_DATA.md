# Datos de prueba E2E

Las pruebas funcionales deben ejecutarse contra un entorno de prueba o contra cuentas y registros claramente identificados como E2E. No uses datos reales de usuarios ni materiales activos.

## Cuentas necesarias

- admin: aprobar, rechazar, entregar y gestionar devoluciones.
- lab_staff: validar que los permisos operativos son equivalentes.
- teacher: crear solicitudes individuales y grupales.
- student: crear únicamente solicitudes individuales.

Las cuentas teacher y student usan Google institucional en el flujo actual. Para automatizarlas se necesitará guardar una sesión Playwright obtenida manualmente o disponer de un proyecto Supabase de pruebas con un método de autenticación controlado para E2E.

## Datos mínimos

1. Un prestatario de prueba con correo institucional.
2. Un ítem de inventario de prueba con stock disponible.
3. Una unidad patrimonial disponible si se probará entrega individual.
4. Una solicitud individual pendiente.
5. Una solicitud grupal creada por teacher.
6. Un préstamo activo con fecha futura de devolución.

## Orden recomendado

1. Crear o seleccionar las cuentas E2E.
2. Crear un ítem de prueba claramente identificado, por ejemplo con código E2E-...
3. Crear una solicitud individual y otra grupal.
4. Aprobar una solicitud completa y otra con cantidades parciales.
5. Entregar ambas solicitudes.
6. Registrar devolución completa, parcial, dañada y faltante.
7. Confirmar stock, estados, historial y correos.
8. Eliminar o archivar únicamente los datos E2E al terminar.

No se incluye un script automático de borrado porque las relaciones entre solicitudes, préstamos, devoluciones y movimientos deben limpiarse en el orden correcto y no se debe arriesgar información real.
