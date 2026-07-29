# Pruebas funcionales

Checklist para validar el sistema antes de dejar una fase como estable o antes de desplegar cambios importantes.

## Reglas de prueba

- Probar con usuarios reales de cada rol: `student`, `teacher`, `lab_staff` y `admin`.
- No probar acciones destructivas con inventario real sin respaldo.
- Después de cada acción crítica, revisar el cambio en la pantalla correspondiente y, si aplica, en Supabase.
- Si aparece un error, guardar ruta, rol, acción realizada, mensaje exacto y hora aproximada.

## 1. Autenticación y rutas

| Prueba | Rol | Resultado esperado | Estado |
| --- | --- | --- | --- |
| Entrar a `/auth/login` | Todos | Muestra login sin errores | Pendiente |
| Iniciar sesión con Google institucional | Todos | Accede si el correo es `@ucuenca.edu.ec` | Pendiente |
| Iniciar sesión con correo no institucional | Todos | Bloquea acceso | Pendiente |
| Entrar a `/dashboard` | admin/lab_staff | Muestra dashboard operativo | Pendiente |
| Entrar a `/dashboard` | teacher/student | Redirige a su portal permitido o no muestra módulos administrativos | Pendiente |
| Cerrar sesión | Todos | Vuelve a login y no permite entrar a rutas protegidas | Pendiente |

## 2. Student

| Prueba | Resultado esperado | Estado |
| --- | --- | --- |
| Entrar a `/solicitudes` | Muestra portal de estudiante | Pendiente |
| Crear solicitud individual | Se crea en estado pendiente | Pendiente |
| Buscar item por nombre | Muestra coincidencias correctas | Pendiente |
| Buscar item por código interno | Muestra coincidencias correctas | Pendiente |
| Buscar item por código patrimonial | Muestra coincidencias correctas | Pendiente |
| Agregar item a solicitud | Muestra notificación y agrega el item abajo | Pendiente |
| Quitar item agregado | Se elimina sin afectar otros items | Pendiente |
| Ver `/solicitudes/mis-solicitudes` | Solo muestra sus solicitudes | Pendiente |
| Abrir detalle lateral de solicitud | Muestra propósito, items y estado | Pendiente |
| Ver solicitud entregada parcialmente | Muestra `Entregada parcialmente` si no se entregó todo lo aprobado | Pendiente |
| Cancelar solicitud pendiente propia | Cambia a cancelada | Pendiente |
| Ver `/solicitudes/mis-prestamos` | Solo muestra sus préstamos | Pendiente |

## 3. Teacher

| Prueba | Resultado esperado | Estado |
| --- | --- | --- |
| Crear solicitud individual | Se crea en estado pendiente | Pendiente |
| Crear solicitud grupal | Permite crear grupos | Pendiente |
| Seleccionar estudiantes en grupal | Solo aparece en flujo grupal | Pendiente |
| Agregar items a un grupo | Se agregan al grupo correcto | Pendiente |
| Quitar items de un grupo | Se eliminan sin romper el formulario | Pendiente |
| Enviar solicitud grupal | Guarda grupos e items | Pendiente |
| Ver mis solicitudes | Solo muestra solicitudes creadas por el docente | Pendiente |
| Ver solicitud grupal entregada parcialmente | Muestra `Entregada parcialmente` si la entrega no cubrió todos los materiales | Pendiente |
| Ver mis préstamos | Muestra préstamos propios | Pendiente |

## 4. Admin y Lab Staff: solicitudes

| Prueba | Resultado esperado | Estado |
| --- | --- | --- |
| Entrar a `/dashboard/solicitudes` | Muestra solicitudes de todos los usuarios | Pendiente |
| Filtrar por estado | Filtra correctamente | Pendiente |
| Buscar por usuario, código o material | Muestra coincidencias | Pendiente |
| Abrir detalle lateral | Muestra solicitante, propósito, items, grupo y estado | Pendiente |
| Aprobar solicitud individual | Cambia a aprobada | Pendiente |
| Rechazar solicitud | Guarda motivo y cambia a rechazada | Pendiente |
| Entregar solicitud aprobada completa | Crea préstamo y descuenta stock | Pendiente |
| Entregar solicitud parcial | Crea préstamo con lo entregado, descuenta solo esa cantidad y el solicitante ve `Entregada parcialmente` | Pendiente |
| Entregar item con unidad patrimonial | Exige seleccionar unidad disponible | Pendiente |

## 5. Admin y Lab Staff: préstamos

| Prueba | Resultado esperado | Estado |
| --- | --- | --- |
| Entrar a `/prestamos` | Carga sin error y responde rápido | Pendiente |
| Buscar item por nombre/código/patrimonial | Muestra coincidencias | Pendiente |
| Crear préstamo directo con un item | Crea préstamo y descuenta stock | Pendiente |
| Crear préstamo directo con varios items | Crea préstamo con todos los items | Pendiente |
| Seleccionar item con unidad patrimonial | Muestra unidades disponibles reales | Pendiente |
| Filtro por estado | Filtra activos, parciales, vencidos y devueltos | Pendiente |
| Filtro por vencimiento | Filtra vencidos, próximos 7 días y sin fecha | Pendiente |
| Limpiar filtros | Restablece búsqueda y filtros | Pendiente |
| Abrir detalle lateral | Muestra items, cantidades, usuario y estado | Pendiente |

## 6. Admin y Lab Staff: devoluciones

| Prueba | Resultado esperado | Estado |
| --- | --- | --- |
| Entrar a `/devoluciones` | Muestra préstamos con pendiente de devolución | Pendiente |
| Buscar por usuario/item/código | Muestra coincidencias | Pendiente |
| Registrar devolución parcial | Actualiza cantidades y deja préstamo parcial | Pendiente |
| Registrar devolución total | Cierra préstamo si todo fue devuelto/faltante | Pendiente |
| Registrar daño | Actualiza cantidad dañada y stock según regla actual | Pendiente |
| Registrar faltante | Actualiza faltante y no devuelve al stock disponible | Pendiente |
| Ver historial de devoluciones | Muestra devolución registrada | Pendiente |

## 7. Admin y Lab Staff: inventario

| Prueba | Resultado esperado | Estado |
| --- | --- | --- |
| Entrar a `/inventario` | Carga inventario sin error | Pendiente |
| Buscar por nombre/código/patrimonial | Muestra coincidencias | Pendiente |
| Filtrar por categoría | Filtra correctamente | Pendiente |
| Filtrar por estado | Filtra correctamente | Pendiente |
| Abrir detalle de item | Muestra stock, códigos y datos básicos | Pendiente |
| Revisar historial reciente del item | Muestra préstamos, devoluciones, mantenimiento y movimientos con colores | Pendiente |
| Revisar unidades patrimoniales | Muestra estado y disponibilidad | Pendiente |
| Revisar movimientos | Muestra movimientos recientes con filtros | Pendiente |

## 8. Admin y Lab Staff: mantenimiento

| Prueba | Resultado esperado | Estado |
| --- | --- | --- |
| Entrar a `/mantenimiento` | Carga formulario e historial | Pendiente |
| Registrar mantenimiento preventivo | Guarda registro | Pendiente |
| Registrar mantenimiento correctivo | Guarda registro | Pendiente |
| Registrar trabajo general | Permite guardar sin item específico si aplica | Pendiente |
| Buscar item por código/patrimonial | Muestra coincidencias | Pendiente |
| Abrir historial en panel lateral | Muestra detalle completo | Pendiente |

## 9. Dashboard y reportes

| Prueba | Resultado esperado | Estado |
| --- | --- | --- |
| Dashboard carga para admin/lab_staff | Muestra resumen sin errores | Pendiente |
| Solicitudes por atender | Conteos coinciden con pendientes/aprobadas | Pendiente |
| Vencimientos de préstamos | Muestra vencidos y próximos 7 días | Pendiente |
| Alertas de stock | Muestra sin stock y crítico | Pendiente |
| Bitácora operativa | Muestra actividad reciente y enlaces correctos | Pendiente |
| Gráficas | Renderizan datos del periodo | Pendiente |
| Exportar todo el reporte | Descarga Excel con varias hojas | Pendiente |
| Exportar módulo individual | Descarga Excel solo del módulo elegido | Pendiente |
| Exportar solicitudes con entrega parcial | El Excel muestra `Entregada parcialmente` cuando aplica | Pendiente |
| Exportar préstamos | El Excel muestra estados en español, no valores internos | Pendiente |

## 10. Cierre

Antes de cerrar una fase:

```bash
npm run lint
npx tsc --noEmit
npm run build
git status
```

La fase puede cerrarse cuando:

- las pruebas críticas de cada rol pasan;
- no hay errores de hidratación en consola;
- no hay rutas que se queden cargando;
- los cambios de stock coinciden con préstamos/devoluciones;
- `git status` queda limpio después de commit y push.
