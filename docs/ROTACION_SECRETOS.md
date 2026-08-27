# Rotación de secretos y credenciales

Este documento define una rotación controlada para credenciales operativas de
laboratorio-prestamos. Nunca registrar valores reales en Git, tickets, capturas,
chats ni manuales.

## Cuándo rotar

- inmediatamente si existe exposición, acceso no autorizado o pérdida del
  dispositivo que almacenaba la credencial;
- cuando una persona con acceso deja de necesitarlo;
- ante una alerta del proveedor;
- como revisión preventiva trimestral para credenciales privilegiadas;
- antes de una entrega institucional si no existe evidencia de revisión
  reciente.

La revisión trimestral no obliga a reemplazar una clave si el proveedor utiliza
otro mecanismo seguro o la rotación causaría indisponibilidad sin beneficio. La
decisión debe quedar registrada.

## Clasificación

| Credencial | Ubicación de uso | Sensibilidad |
| --- | --- | --- |
| Contraseña/URL de conexión PostgreSQL | Estación de respaldos | Secreto crítico |
| `RESEND_API_KEY` | Vercel | Secreto crítico |
| Secreto de Google OAuth | Google Cloud y Supabase Auth | Secreto crítico |
| Contraseña de cifrado de respaldos | Gestor de contraseñas y archivo local privado | Secreto crítico |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Navegador/Vercel | Identificador público protegido por RLS, no secreto |
| `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_APP_URL` | Navegador/Vercel | Configuración pública |

Las claves `service_role`, tokens personales, cookies y refresh tokens también
son secretos críticos si se utilizan en herramientas E2E u operación, aunque no
formen parte del bundle de producción.

## Procedimiento general

1. Identificar todos los consumidores de la credencial sin imprimir su valor.
2. Crear la credencial reemplazante en el proveedor cuando admita coexistencia.
3. Actualizar un consumidor a la vez.
4. Validar con una operación read-only o un smoke seguro.
5. Actualizar los servicios locales y ejecutar `systemctl --user daemon-reload`
   si corresponde.
6. Revocar la credencial anterior solo después de confirmar todos los
   consumidores.
7. Registrar fecha, responsable, sistemas actualizados y resultado, nunca el
   valor de la credencial.
8. Ante HTTP 429 o rechazo inesperado, detenerse; no realizar reintentos en
   bucle.

## PostgreSQL y respaldos

Al cambiar la contraseña de base de datos:

1. actualizar `DATABASE_URL` únicamente en el archivo local privado;
2. ejecutar un respaldo manual;
3. verificar el manifiesto y la copia cifrada;
4. confirmar que el timer diario continúa activo.

No copiar la URL en la línea de comandos, porque puede quedar visible en el
historial o en listados de procesos. Utilizar los archivos de entorno privados.

## Resend

1. Crear una nueva API key en Resend.
2. Actualizar `RESEND_API_KEY` en Vercel.
3. desplegar sin eliminar todavía la clave anterior;
4. validar con el mecanismo de correo seguro aprobado, sin envíos masivos;
5. revocar la clave anterior.

No modificar `EMAIL_FROM` durante una rotación salvo que también cambie el
dominio remitente verificado.

## Google OAuth y Supabase Auth

1. Confirmar el cliente OAuth utilizado por Supabase.
2. Crear/reemplazar el secreto en Google Cloud siguiendo la capacidad del
   proveedor.
3. Actualizar el proveedor Google en Supabase Auth.
4. Verificar Site URL y Redirect URLs.
5. validar una autenticación real controlada;
6. revocar el secreto anterior cuando la autenticación nueva funcione.

No cambiar Client ID, dominios autorizados ni redirects durante una rotación de
secreto salvo que exista un cambio de dominio planificado.

## Cifrado de respaldos

Cambiar la contraseña de cifrado no vuelve a cifrar automáticamente archivos
anteriores. Antes de rotarla:

1. conservar de forma segura la contraseña anterior mientras existan copias que
   dependan de ella;
2. crear la nueva contraseña mediante el mecanismo protegido;
3. generar una copia nueva;
4. ejecutar la prueba de recuperación cifrada;
5. etiquetar en el gestor de contraseñas el período de vigencia de cada clave.

No eliminar la contraseña anterior hasta que las copias correspondientes hayan
salido de la política de conservación.

## Verificación posterior

- CI y build en verde;
- smoke público de producción en verde;
- inicio de sesión Google validado cuando se rotó OAuth;
- respaldo y prueba cifrada en verde cuando se rotó base de datos o cifrado;
- cero secretos añadidos a Git;
- credencial anterior revocada o motivo documentado para mantenerla.
