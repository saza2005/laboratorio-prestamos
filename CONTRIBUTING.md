# Contribuir al proyecto

Gracias por ayudar a mantener Laboratorio Préstamos. Los cambios deben preservar
la privacidad, autorización y trazabilidad del sistema.

## Preparación local

1. Crea una rama desde `main` actualizada.
2. Ejecuta `npm ci`.
3. Copia `.env.example` como `.env.local` y completa valores locales fuera de
   Git.
4. No reutilices credenciales de producción para desarrollo o pruebas.

```bash
npm ci
npm run dev
```

## Alcance de los cambios

Mantén cada pull request enfocada en un objetivo. Separa cambios visuales,
funcionales, de base de datos y operativos cuando puedan validarse de forma
independiente.

Antes de editar, identifica el nivel de riesgo:

- **Read-only:** documentación, presentación o consultas sin escritura.
- **Funcional:** formularios, Server Actions, reglas o estados de negocio.
- **Autorización:** roles, guards, RLS, cookies, OAuth o acceso a datos.
- **Base de datos:** tablas, funciones, triggers, policies o privilegios.
- **Operación:** respaldos, restauración, despliegue, secretos o monitoreo.

Los tres últimos niveles requieren evidencia explícita y una revisión más
estricta.

## Validación mínima

Antes de abrir una pull request:

```bash
npm run lint
npx tsc --noEmit
npm run test:unit
npm run build
git diff --check
```

Añade o actualiza pruebas cuando cambie lógica. No reduzcas aserciones ni ignores
errores para obtener un PASS.

## Pruebas E2E

Prefiere pruebas read-only. Una prueba mutante solo debe ejecutarse cuando:

- el objetivo no pueda validarse localmente o de forma read-only;
- utilice fixtures E2E dedicadas;
- tenga presupuesto explícito de escrituras;
- verifique el estado remoto después de cada cambio;
- restaure exactamente el estado original;
- no tenga reintentos automáticos del write.

Seleccionar una opción sin enviar un formulario no es una mutación de negocio.
Crear solicitudes, cambiar roles, entregar o devolver sí lo es.

## Base de datos y Supabase

- No edites migraciones ya aplicadas.
- Añade una migración nueva, ordenada y con nombre descriptivo.
- No ejecutes `db push` sin comparar antes `supabase migration list`.
- No apliques el baseline sobre una base que ya contiene el esquema.
- Revisa RLS y grants para cada objeto nuevo.
- No utilices una service role key si el caso puede resolverse con las políticas
  y clientes existentes.

Las migraciones históricas de `supabase/legacy-migrations` son evidencia y no
forman parte del linaje aplicable.

## Seguridad y privacidad

Nunca incluyas en commits, issues, logs o capturas:

- contraseñas, tokens, cookies o claves;
- URLs de conexión con credenciales;
- correos, UUID o datos personales reales;
- respaldos o extractos de la base de datos.

Reporta vulnerabilidades mediante el canal privado descrito en
[la política de seguridad](.github/SECURITY.md).

## Pull requests

Completa la plantilla, explica el impacto y adjunta evidencia no sensible. Las
actualizaciones de dependencias deben revisar changelog, CI, build y un smoke
proporcional antes de integrarse.

Si descubres un defecto fuera del alcance, repórtalo por separado; no lo mezcles
silenciosamente con el cambio actual.
