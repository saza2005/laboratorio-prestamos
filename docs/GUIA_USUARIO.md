# Guía de usuario

Sistema web para gestionar inventario, solicitudes, préstamos, devoluciones y mantenimiento del laboratorio.

## Acceso

- Los usuarios nuevos deben ingresar con Google institucional `@ucuenca.edu.ec`.
- Usuarios existentes pueden iniciar sesión con contraseña si aún no han vinculado Google.
- Si una cuenta institucional ya tiene perfil previo y no puede entrar con Google, debe ser revisada por administración.

## Estudiante

El estudiante puede:

- Crear solicitudes individuales.
- Buscar materiales por nombre, código interno, código patrimonial o categoría.
- Revisar sus solicitudes en `Mis solicitudes`.
- Revisar préstamos activos, vencidos, parciales y devueltos en `Mis préstamos`.
- Abrir el detalle de solicitudes y préstamos desde un panel lateral al seleccionar una fila.

El estudiante no puede:

- Crear solicitudes grupales.
- Ver listado completo de estudiantes.
- Aprobar, entregar o devolver préstamos.
- Gestionar inventario o mantenimiento.

Flujo recomendado:

1. Entrar al portal de solicitudes.
2. Crear una solicitud individual.
3. Agregar materiales desde el buscador.
4. Enviar la solicitud.
5. Revisar el estado en `Mis solicitudes`.
6. Cuando el laboratorio entregue el préstamo, revisar el detalle en `Mis préstamos`.

## Docente

El docente puede:

- Crear solicitudes individuales.
- Crear solicitudes grupales.
- Seleccionar estudiantes para grupos.
- Revisar las solicitudes que creó.
- Revisar sus préstamos.
- Abrir el detalle de solicitudes y préstamos desde un panel lateral al seleccionar una fila.

Flujo de solicitud grupal:

1. Entrar a solicitudes grupales.
2. Crear uno o más grupos.
3. Seleccionar líder/estudiantes según corresponda.
4. Buscar materiales y agregarlos al grupo.
5. Revisar cantidades y enviar.
6. Consultar estado en `Mis solicitudes`.

## Laboratorista

El laboratorista puede:

- Ver solicitudes de todos los usuarios.
- Aprobar o rechazar solicitudes.
- Entregar solicitudes aprobadas.
- Confirmar entregas parciales cuando no existe stock completo.
- Registrar préstamos directos.
- Registrar devoluciones parciales o totales.
- Registrar mantenimiento.
- Consultar inventario, unidades patrimoniales y movimientos.
- Revisar detalles en panel lateral sin perder el listado principal.

Flujo de solicitud a préstamo:

1. Entrar a `Gestión de solicitudes`.
2. Seleccionar una solicitud pendiente para abrir el panel lateral de detalle.
3. Aprobar cantidades disponibles o rechazar con motivo.
4. En solicitudes aprobadas, confirmar entrega.
5. Si el stock actual no alcanza, ajustar cantidades y confirmar entrega parcial.
6. Revisar el préstamo generado en `Préstamos`.

Flujo de devolución:

1. Entrar a `Devoluciones`.
2. Seleccionar el ítem pendiente desde el formulario.
3. Registrar cantidades OK, dañadas o faltantes.
4. Confirmar devolución.
5. Verificar el historial y el stock actualizado.

## Administrador

El administrador puede realizar las mismas acciones que el laboratorista y además debe encargarse de:

- Revisar perfiles y roles en Supabase cuando sea necesario.
- Confirmar políticas RLS.
- Ejecutar migraciones SQL.
- Supervisar despliegues y respaldos.

## Recomendaciones de uso

- Antes de entregar una solicitud aprobada, revisar el stock disponible actual.
- Para equipos con unidad patrimonial, seleccionar la unidad correcta.
- En devoluciones, marcar como faltante solo cuando el material no será devuelto.
- Registrar observaciones en mantenimiento y devoluciones cuando exista daño o condición especial.
- Usar los filtros de cada módulo para encontrar registros por código, usuario o estado.
- En listados con panel lateral, seleccionar una fila para abrir el detalle y cerrar con `Cerrar`, `Esc` o clic fuera del panel.
- Antes de confirmar acciones críticas, revisar el cuadro de confirmación. Si aparece un error, leer el mensaje mostrado y corregir los datos antes de intentar nuevamente.


## Interfaz

Los listados principales muestran filas compactas para evitar saturar la pantalla. Al seleccionar una fila, el sistema abre un panel lateral con el detalle completo.

El panel lateral permite:

- cerrar con el botón `Cerrar`;
- cerrar con la tecla `Esc`;
- cerrar tocando fuera del panel;
- navegar con teclado sin mover el foco al fondo de la página.

Las acciones críticas muestran una confirmación antes de guardar, aprobar, rechazar, entregar, devolver o cancelar registros.
