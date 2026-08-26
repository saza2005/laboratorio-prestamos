# laboratorio-prestamos

Sistema web de gestión de préstamos de laboratorio.

## Stack

- Next.js App Router
- TypeScript
- TailwindCSS
- Supabase Auth
- PostgreSQL con RLS
- Server Actions
- Vercel

## Módulos principales

- Autenticación institucional
- Dashboard
- Inventario
- Unidades patrimoniales
- Movimientos de inventario
- Solicitudes individuales
- Solicitudes grupales
- Aprobación y rechazo de solicitudes
- Entrega completa y parcial
- Préstamos
- Devoluciones
- Mantenimiento
- Exportaciones

## Roles

- `admin`
- `lab_staff`
- `teacher`
- `student`

## Documentación

- [Guía de usuario](docs/GUIA_USUARIO.md)
- [Operación y despliegue](docs/OPERACION_DESPLIEGUE.md)
- [Estado actual del proyecto](docs/ESTADO_PROYECTO.md)
- [Manual de Administrador](docs/manuales/Manual_Administrador.docx)
- [Manual de Laboratorista](docs/manuales/Manual_Laboratorista.docx)
- [Manual de Docente](docs/manuales/Manual_Docente.docx)
- [Manual de Estudiante](docs/manuales/Manual_Estudiante.docx)

## Desarrollo local

```bash
npm install
npm run dev
```

Validación:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Notas

No subir claves ni valores reales de variables de entorno al repositorio.
Confirmar que las migraciones SQL estén aplicadas en Supabase antes de usar el sistema en producción.
