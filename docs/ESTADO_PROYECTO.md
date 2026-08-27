# Estado del proyecto

Actualizado: 2026-08-26 (America/Guayaquil)

## Estado funcional

Los cambios funcionales y visuales principales se encuentran implementados y
validados:

| Cambio | Alcance | Estado |
| --- | --- | --- |
| CHANGE-001 | Entrega parcial y devoluciones relacionadas | Validado / cerrado |
| CHANGE-002 | Administración segura de roles | Validado / cerrado |
| CHANGE-003 | Búsqueda y filtro de estudiantes | Validado / cerrado |
| CHANGE-004 | Analítica de uso de bienes y exportación | Validado / cerrado |
| CHANGE-005 | Rediseño profesional y responsive | Validado / cerrado |

Los ciclos E2E asociados terminaron en PASS. Los flujos mutantes históricos no
deben repetirse sin un objetivo concreto, presupuesto de escritura y respaldo.

## Estado técnico

- CI valida auditoría de dependencias, ESLint, TypeScript, pruebas unitarias y
  build de producción.
- CodeQL analiza JavaScript y TypeScript en cada cambio a `main`, en pull
  requests y semanalmente mediante el conjunto ampliado de consultas de
  seguridad.
- GitHub mantiene activas las alertas y actualizaciones de seguridad de
  Dependabot, además de Secret Scanning con protección de pushes. Las
  correcciones automáticas se proponen mediante pull requests y requieren
  revisión antes de integrarse.
- El repositorio acepta reportes privados de vulnerabilidades mediante GitHub
  Security Advisories y publica las reglas de reporte en `.github/SECURITY.md`.
- Las acciones externas de los workflows están fijadas a commits específicos
  para reducir el riesgo de cambios inesperados en la cadena de suministro.
  Dependabot revisa mensualmente esos commits y propone sus actualizaciones en
  una pull request agrupada.
- Las versiones mayores de herramientas de desarrollo quedan fuera de las
  actualizaciones automáticas y requieren una fase explícita de compatibilidad.
- Pull requests e incidencias utilizan plantillas con controles explícitos de
  validación, migraciones, privacidad y pruebas mutantes.
- La rama `main` está protegida: exige pull request, CI y CodeQL en PASS, rama
  actualizada, conversaciones resueltas e historial lineal; impide force-push y
  eliminación. El bypass administrativo se reserva para emergencias.
- El smoke público programado valida portada, login y callback OAuth cada seis
  horas.
- Un smoke automatizado con Axe valida semanalmente reglas WCAG A/AA en portada,
  login y registro institucional.
- La aplicación está desplegada en Vercel y el smoke público actual responde
  correctamente.
- El linaje canónico de migraciones está documentado en
  `OPERACION_DESPLIEGUE.md`.
- Los privilegios por defecto de nuevos objetos del esquema `public` están
  endurecidos tanto en producción como en el entorno E2E: no se conceden
  implícitamente a `anon` ni a `authenticated`.
- Los secretos permanecen fuera del repositorio.

## Respaldo y recuperación

- Respaldo diario local de esquema `public`, datos `public` y datos `auth`.
- Hashes SHA-256 y validación automática antes de publicar cada respaldo.
- Copia externa comprimida y cifrada con GPG/AES-256 cuando la memoria USB está
  conectada.
- Prueba de recuperación local validada sin ejecutar SQL ni modificar Supabase.
- La contraseña de recuperación debe mantenerse en un gestor independiente de
  la memoria USB y del computador.

## Operación pendiente y recurrente

Estas actividades no representan defectos abiertos del producto:

1. Revisar periódicamente GitHub Actions y Vercel.
2. Conectar la memoria USB durante la ventana diaria de respaldo o ejecutar una
   copia manual después de reconectarla.
3. Comprobar mensualmente que exista una copia externa reciente y que su checksum
   sea válido.
4. Realizar trimestralmente una prueba de recuperación en un entorno aislado.
   La importación real de datos `auth` requiere un procedimiento controlado y no
   debe realizarse sobre producción.
5. Ejecutar el checklist de `PRUEBAS_FUNCIONALES.md` antes de cambios importantes
   o de una aceptación institucional, registrando fecha, ambiente y responsable.
6. Mantener actualizados el dominio de Vercel, OAuth de Google y las URLs de
   redirección de Supabase si cambia el dominio público.

La atención de alertas y fallos está documentada en
`RESPUESTA_INCIDENTES.md`.
La revisión y sustitución controlada de credenciales está documentada en
`ROTACION_SECRETOS.md`.

## Límites conocidos

- El plan actual no incluye Point-in-Time Recovery ni restauración administrada
  de Supabase.
- La copia USB protege contra pérdida del disco principal, pero depende de que la
  memoria se conecte y se custodie correctamente.
- Las señales de analítica apoyan decisiones administrativas; no determinan por
  sí solas compra, renovación o reemplazo de bienes.
