# Política de seguridad

## Versiones soportadas

Este proyecto mantiene una única línea activa. Solo la versión desplegada desde
la rama `main` recibe correcciones de seguridad.

| Versión | Soporte |
| --- | --- |
| `main` / producción actual | Sí |
| Commits, ramas o despliegues anteriores | No |

## Reportar una vulnerabilidad

No publiques vulnerabilidades, credenciales, datos personales ni pasos de
explotación en un issue, discusión o pull request público.

Utiliza **Security > Advisories > Report a vulnerability** en GitHub para enviar
un reporte privado. Incluye, cuando sea posible:

- componente y ruta afectados;
- impacto observado o potencial;
- pasos mínimos para reproducir sin modificar datos reales;
- versión, commit o fecha aproximada del hallazgo;
- propuesta de mitigación, si existe.

No incluyas tokens, contraseñas, cookies, claves de Supabase, datos personales o
copias de la base. Si el hallazgo involucra un secreto real, indica únicamente
qué tipo de secreto está afectado para coordinar su rotación por un canal seguro.

## Proceso de respuesta

El responsable del repositorio intentará:

1. confirmar la recepción en un máximo de tres días laborables;
2. realizar una evaluación inicial en un máximo de siete días laborables;
3. mantener el reporte privado mientras exista riesgo para usuarios o datos;
4. corregir, validar y desplegar según la severidad y el alcance;
5. documentar la resolución sin divulgar información sensible.

Los tiempos de corrección dependen de la severidad, reproducibilidad y posibles
dependencias externas. El reporte puede cerrarse con una explicación si no se
reproduce, no afecta una versión soportada o no representa una vulnerabilidad.

## Investigación segura

- No alteres ni elimines datos.
- No intentes acceder a cuentas ajenas.
- No ejecutes cargas que degraden el servicio.
- No envíes correos ni notificaciones reales como parte de una prueba.
- Utiliza datos propios o ficticios y detente al demostrar el impacto mínimo.

La respuesta interna ante incidentes y la rotación de credenciales se detallan
en `docs/RESPUESTA_INCIDENTES.md` y `docs/ROTACION_SECRETOS.md`.
