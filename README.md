# Laboratorio Préstamos

Sistema web para administrar inventario, solicitudes, préstamos, entregas,
devoluciones, mantenimiento y analítica de uso de bienes de laboratorio.

[![CI](https://github.com/saza2005/laboratorio-prestamos/actions/workflows/ci.yml/badge.svg)](https://github.com/saza2005/laboratorio-prestamos/actions/workflows/ci.yml)
[![CodeQL](https://github.com/saza2005/laboratorio-prestamos/actions/workflows/codeql.yml/badge.svg)](https://github.com/saza2005/laboratorio-prestamos/actions/workflows/codeql.yml)
[![Accessibility](https://github.com/saza2005/laboratorio-prestamos/actions/workflows/accessibility.yml/badge.svg)](https://github.com/saza2005/laboratorio-prestamos/actions/workflows/accessibility.yml)

## Funcionalidad

- Inventario, unidades patrimoniales y movimientos.
- Solicitudes individuales y grupales.
- Aprobación, rechazo y entrega completa o parcial.
- Préstamos directos y devoluciones parciales o totales.
- Registro e historial de mantenimiento.
- Administración segura de usuarios y roles.
- Búsqueda de estudiantes por nombre y correo.
- Analítica de uso de bienes y exportación Excel.
- Interfaces adaptables para escritorio, tablet y móvil.

## Roles

| Rol | Alcance general |
| --- | --- |
| `admin` | Administración completa, usuarios y analítica |
| `lab_staff` | Operación del laboratorio y analítica |
| `teacher` | Solicitudes individuales y grupales |
| `student` | Solicitudes y consulta de sus propios registros |

La autorización efectiva se aplica en el servidor y mediante RLS; esta tabla es
solo un resumen funcional.

## Tecnología

- Next.js App Router, React y TypeScript.
- Tailwind CSS.
- Supabase Auth y PostgreSQL con RLS.
- Server Components y Server Actions.
- ExcelJS y Recharts.
- Playwright para pruebas unitarias, E2E y accesibilidad.
- Vercel para despliegue.

## Desarrollo local

Requisitos: Node.js compatible con Next.js 16, npm y un proyecto Supabase ya
configurado.

```bash
npm ci
npm run dev
```

Variables esperadas, sin incluir valores reales:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
DATABASE_URL
NEXT_PUBLIC_APP_URL
RESEND_API_KEY
EMAIL_FROM
```

Puede partir de `.env.example`. Las variables operativas de respaldo están
documentadas en `.env.backup.example` y las pruebas opt-in en
`tests/.env.e2e.example`. Los archivos derivados `.env.local`, `.env.backup` y
`tests/.env.e2e.local` permanecen ignorados por Git.

`DATABASE_URL` es exclusivamente de operación controlada y no la consume el
runtime web. Nunca debe exponerse con el prefijo `NEXT_PUBLIC_`. La aplicación
actual tampoco requiere una service role key de Supabase.

## Validación

```bash
npm run check:safe
npm run build
```

La CI ejecuta auditoría de dependencias de producción, ESLint, TypeScript,
pruebas unitarias y build. CodeQL analiza JavaScript/TypeScript y existe un
smoke programado de accesibilidad para las rutas públicas.

Las pruebas E2E que modifican datos no deben ejecutarse como smoke general:
requieren un objetivo concreto, datos dedicados y presupuesto explícito de
escritura.

## Base de datos

Las migraciones canónicas están en `supabase/migrations`. Antes de ejecutar
`supabase db push`, se debe comparar el historial remoto con
`supabase migration list`. No se debe aplicar el baseline sobre una base que ya
contiene el esquema.

El procedimiento detallado y el linaje vigente están en
[Operación y despliegue](docs/OPERACION_DESPLIEGUE.md).

## Documentación

- [Guía para contribuir](CONTRIBUTING.md)
- [Estado actual](docs/ESTADO_PROYECTO.md)
- [Operación y despliegue](docs/OPERACION_DESPLIEGUE.md)
- [Pruebas funcionales](docs/PRUEBAS_FUNCIONALES.md)
- [Respuesta a incidentes](docs/RESPUESTA_INCIDENTES.md)
- [Rotación de secretos](docs/ROTACION_SECRETOS.md)
- [Política para reportar vulnerabilidades](.github/SECURITY.md)
- [Guía de usuario](docs/GUIA_USUARIO.md)
- [Manual de Administrador](docs/manuales/Manual_Administrador.docx)
- [Manual de Laboratorista](docs/manuales/Manual_Laboratorista.docx)
- [Manual de Docente](docs/manuales/Manual_Docente.docx)
- [Manual de Estudiante](docs/manuales/Manual_Estudiante.docx)

## Seguridad y respaldos

- Dependabot, Secret Scanning con Push Protection y CodeQL están habilitados.
- Los secretos permanecen fuera del repositorio.
- El proyecto incluye respaldo local diario, copia externa cifrada, verificación
  de integridad y prueba programada de recuperación.
- No se deben imprimir ni registrar tokens, cookies, contraseñas o datos
  personales durante pruebas y tareas operativas.
