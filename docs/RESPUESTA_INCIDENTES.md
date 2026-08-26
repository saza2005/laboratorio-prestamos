# Respuesta a incidentes

Este procedimiento cubre fallos de disponibilidad, autenticación, integridad de
datos, despliegue y respaldos de laboratorio-prestamos. No sustituye las
políticas institucionales ni autoriza cambios destructivos sobre producción.

## Responsabilidades

- Responsable funcional: confirma el impacto sobre estudiantes, docentes y
  personal del laboratorio.
- Responsable técnico: diagnostica aplicación, Vercel, Supabase, OAuth y
  respaldos; conserva evidencias y propone la recuperación.
- Responsable institucional: autoriza restauraciones, indisponibilidad
  prolongada y comunicaciones a usuarios.

Una misma persona puede asumir más de una función en equipos pequeños, pero las
restauraciones de producción deben quedar expresamente autorizadas.

## Severidad

| Nivel | Criterio | Respuesta inicial |
| --- | --- | --- |
| SEV-1 | Pérdida o exposición probable de datos, acceso indebido o sistema completamente indisponible | Detener operaciones afectadas, preservar evidencia y escalar inmediatamente |
| SEV-2 | Función crítica degradada sin pérdida confirmada de datos | Diagnosticar el mismo día y comunicar alternativa operativa |
| SEV-3 | Fallo parcial, alerta de respaldo o problema sin impacto inmediato | Revisar en la siguiente ventana operativa |

## Registro mínimo

Registrar sin copiar secretos ni información personal innecesaria:

- fecha y hora local;
- persona que detectó el incidente;
- entorno afectado;
- síntoma observable y ruta funcional;
- severidad inicial;
- último cambio o despliegue conocido;
- estado de CI, Vercel, Supabase y respaldos;
- decisiones, autorizaciones y resultado final.

No adjuntar tokens, cookies, contraseñas, claves, cadenas de conexión ni volcados
de base de datos a tickets o chats.

## Diagnóstico inicial

1. Confirmar si el problema afecta producción o solo el entorno local/E2E.
2. Ejecutar el smoke público read-only:

   ```bash
   PRODUCTION_URL="https://laboratorio-prestamos.vercel.app" npm run check:production
   ```

3. Revisar el último workflow de GitHub Actions y el despliegue de Vercel.
4. Consultar los servicios locales sin mostrar sus líneas de comando ni
   variables sensibles:

   ```bash
   systemctl --user show laboratorio-prestamos-backup.service \
     --property=Result --property=ExecMainStatus --property=ActiveState
   systemctl --user show laboratorio-prestamos-production-health.service \
     --property=Result --property=ExecMainStatus --property=ActiveState
   ```

5. Revisar el registro privado de alertas:

   ```text
   ~/.local/state/laboratorio-prestamos/operational-alerts.log
   ```

6. No repetir operaciones mutantes que hayan terminado con resultado incierto.

## Escenarios frecuentes

### Producción no responde

- Confirmar el fallo con el smoke público.
- Revisar Vercel y el último despliegue.
- Si el despliegue nuevo es causal, preferir rollback desde Vercel antes que un
  cambio apresurado sin validar.
- Confirmar nuevamente portada, login y callback OAuth después de recuperar.

### Inicio de sesión con Google falla

- Verificar Site URL y Redirect URLs en Supabase.
- Verificar orígenes y redirect URI autorizados en Google Cloud OAuth.
- Confirmar `NEXT_PUBLIC_APP_URL` y secretos en Vercel sin imprimir sus valores.
- No crear cuentas sustitutas ni cambiar roles como mecanismo de recuperación.

### Alerta de respaldo

- Comprobar que la memoria USB esté montada cuando corresponda.
- Revisar espacio disponible y permisos del destino.
- Ejecutar la verificación sobre el último respaldo local o cifrado.
- No borrar la última copia válida para liberar espacio.

### Sospecha de datos incorrectos

- Detener temporalmente el flujo afectado.
- Identificar la primera operación posiblemente irreversible.
- Consultar estado remoto de forma read-only.
- Preservar logs y respaldos anteriores.
- No restaurar ni ejecutar cleanup manual sin identificar exactamente el alcance.

## Recuperación desde respaldo

1. Verificar el archivo y su checksum.
2. Probar la recuperación en un entorno aislado.
3. Documentar qué esquemas y datos se recuperarían.
4. Obtener autorización institucional explícita.
5. Crear un respaldo adicional del estado actual antes de restaurar.
6. Ejecutar la restauración controlada y validar integridad, autenticación y
   flujos críticos.

Los datos de `auth` no deben importarse directamente sobre un proyecto activo
sin un procedimiento específico. Mientras el plan no incluya Point-in-Time
Recovery, una restauración completa requiere mayor coordinación y tiempo de
indisponibilidad.

## Cierre

Un incidente puede cerrarse cuando:

- la causa está demostrada o claramente acotada;
- el servicio está recuperado;
- no quedan escrituras, cleanup o recovery pendientes;
- las comprobaciones relevantes pasan;
- las acciones realizadas están registradas;
- existe una medida preventiva cuando sea razonable.

Después de un SEV-1 o SEV-2, realizar una revisión breve de causa raíz sin
eliminar ni reinterpretar la evidencia original.
