# FASE 6.3B-L1-F3V

## Resultado

F3V fue exclusivamente local. No ejecuto DNS, HTTP, TLS, baseline,
clean-state, L1 PRE, browser ni mutacion.

Los entrypoints actuales son CLI con logica top-level. Importarlos ejecuta
validaciones de argumentos y puede terminar el proceso; no son cores
exportables. El clean-state ejecuta baseline mediante `execFileSync`, por lo
que la auditoria historica reconstruye baseline `3` y clean-state `2`.

```text
baseline top-level=1
clean-state top-level=2
baseline nested inside clean-state=2
post-failure clean-state=1
baseline total=3
clean-state total=2
process model=SEPARATE_NODE_PROCESSES
```

## Arquitectura propuesta

Un preflight futuro puede vivir en un proceso Node, cargar entorno una vez y
compartir el mismo contexto global de Node/Undici/DNS. El orden debe ser:

1. freeze e isolation
2. storageState local
3. baseline core
4. clean-state-specific core
5. L1 PRE core

Cada core debe devolver un resultado estructurado y nunca llamar
`process.exit`. El coordinador debe detenerse en el primer fallo y no hacer
ninguna comprobacion remota post-fallo.

El baseline nested no es semantica de negocio; es un artefacto de la
implementacion CLI actual. Eliminar la duplicacion requiere extraer cores y
validar que clean-state conserva sus invariantes.

## Cliente y red

Baseline, clean-state y L1 usan `supabase-js`/PostgreSQL REST con contexto de
autorizacion de lectura service-role. Cada ejecucion actual crea su cliente;
un proceso unico puede reutilizar contexto global y, si se desea, inyectar
un cliente compartido. Un unico cliente no es necesario para preservar
semantica; varias instancias dentro del mismo proceso siguen siendo validas.

El dispatcher global y runtime DNS serian compartidos en un solo proceso.
El pool de conexiones podria reutilizar conexiones, pero no se garantiza.
Esto no arregla DNS: solo elimina el limite de proceso entre gates y permite
retener el mismo contexto runtime.

## Validacion local

El coordinador sintetico paso baseline-fail, clean-state-fail, L1-fail,
all-pass, regresion de presupuesto nested, regresion post-fallo y redaccion
de secretos. TypeScript, Node, ESLint dirigido, suite L1, cantidad y
regresiones R1-R4 tambien pasaron.

```text
L1_F3V_IMPLEMENTATION_CLASS=MINIMAL_VERIFIER_CORE_EXTRACTION_REQUIRED
L1_F3V_SINGLE_PROCESS_FEASIBLE=yes
L1_F3V_SINGLE_PROCESS_RECOMMENDED=yes
L1_F3V_FROZEN_RUNTIME_REFACTOR_REQUIRED=yes
L1_F3V_RUNTIME_FREEZE_CHANGED=no
L1_F3V_POST_F3O_FREEZE_REMAINS_VALID=yes
```

La implementacion real requiere autorizacion local separada y un nuevo
freeze antes de cualquier ejecucion remota.

## F3W implementation result

The local implementation extracted non-exiting cores and added a single-
process coordinator. The old freeze is stale and the new
`POST_F3W_SINGLE_PROCESS_CORES_VALIDATED` manifest passed self-check. No
remote execution was performed.
