# FASE 6.3B-L1-F3W

## Implementacion

F3AI forensic work was local-only and made no runtime change. The canonical
F3AD freeze remains valid; no new remote preflight is authorized by this
phase.

F3AJ modified only the local provenance harness. The canonical F3AD runtime
freeze remains unchanged.

Se extrajeron cores reutilizables de baseline, clean-state y L1 PRE. Los
wrappers CLI conservan su validacion de argumentos y salida; los cores no
ejecutan automaticamente, no llaman `process.exit` y devuelven resultados
estructurados.

El core clean-state recibe el resultado de baseline y ejecuta solo sus scans
especificos. El wrapper CLI mantiene la compatibilidad historica ejecutando
baseline core y luego clean-state core. El coordinador nuevo compone los tres
cores en un unico proceso y usa multiples clientes Supabase dentro del mismo
contexto Node/Undici.

## Presupuesto

```text
TOP_LEVEL_SINGLE_PROCESS_PREFLIGHT=1
BASELINE_CORE=1
CLEAN_STATE_CORE=1
L1_PRE_CORE=1
NESTED_BASELINE=0
POST_FAILURE_REMOTE_CHECK=0
CHILD_PROCESS=0
```

El coordinador detiene la secuencia en el primer fallo. No existe retry de
etapa completa ni comprobacion remota posterior al fallo.

## Validacion local

Pasaron import-safety, compatibilidad CLI sintética, coordinator all-pass,
baseline-fail, clean-state-fail, L1-fail, no nested baseline, stop-on-fail,
redaccion de secretos, TypeScript, Node checks, ESLint dirigido, suite L1,
cantidad y regresiones R1-R4. No se ejecuto ninguna operacion remota.

La semantica de L1 conserva maxAttempts `2`, clases retryables, backoff DNS
de `1000 ms`, fresh query y ausencia de intento 3.

## Freeze

`POST_F3O_DNS_BACKOFF_VALIDATED` queda `STALE` porque cambiaron scripts
runtime. El nuevo manifest ignorado es:

```text
POST_F3W_SINGLE_PROCESS_CORES_VALIDATED
L1_F3W_NEW_FREEZE_MANIFEST_CREATED=yes
L1_F3W_NEW_FREEZE_SELF_CHECK=PASS
L1_F3W_RUNTIME_CRITICAL_FREEZE_FILE_COUNT=8
```

Esto no demuestra que DNS este corregido. Solo elimina el limite de proceso
para una futura ejecucion remota, que requiere autorizacion separada.

## FASE 6.3B-L1-F3X result

The one authorized single-process coordinator execution passed its freeze
gate and executed the baseline core once. The baseline core failed, so the
coordinator stopped before clean-state and L1 PRE. No post-failure remote
check ran. This does not provide new L1 DNS evidence and does not change the
historical F3R or final-preflight results.

```text
L1_F3X_SINGLE_PROCESS_PREFLIGHT_TOP_LEVEL_EXECUTIONS=1
L1_F3X_BASELINE_CORE_EXECUTIONS=1
L1_F3X_CLEAN_STATE_CORE_EXECUTIONS=0
L1_F3X_L1_PRE_CORE_EXECUTIONS=0
L1_F3X_NESTED_BASELINE_EXECUTIONS=0
L1_F3X_POST_FAILURE_REMOTE_CHECK_EXECUTIONS=0
L1_F3X_PROTOCOL_BUDGET_COMPLIANT=yes
L1_F3X_SINGLE_PROCESS_PREFLIGHT_RESULT=FAIL
L1_F3X_FAILURE_CLASS=BASELINE_CORE_FAILURE_UNCLASSIFIED
REMOTE_WRITES=0
STATE=CLEAN
```

F3Y classified the underlying baseline failure as unresolved because F3X
did not persist baseline detail and the coordinator discarded the failed
structured result. This is a coordinator classification defect and an
observability gap, not new DNS or L1 evidence.

F3Z locally added baseline transport/result observability and preserved the
no-retry contract. The new canonical freeze is
`POST_F3Z_BASELINE_OBSERVABILITY_VALIDATED`; no remote validation ran.

F3AA was the single authorized remote validation. It passed freeze and local
gates but baseline failed before clean-state and L1 PRE; the runtime result
did not contain structured baseline detail. Further local audit is required
before any new remote authorization.

F3AB completed the local exception-path hardening. The F3Z freeze is stale;
the new local freeze is `POST_F3AB_BASELINE_EXCEPTION_PATH_VALIDATED`.

## F3AC result

The single-process coordinator executed once against the F3AB freeze.
Freeze, isolation and storage passed; baseline executed once and failed,
so clean-state and L1 PRE did not run. The CLI reporting layer still maps
legacy names instead of the F3AB envelope fields, leaving the failure
unclassified in the remote output. The process budget remained compliant.

F3AD added the canonical envelope formatter and changed the coordinator's
future freeze target to `POST_F3AD_FORMATTER_PROJECTION_VALIDATED`. Local
tests pass; no remote execution occurred.

F3AE passed the F3AD freeze and local gates, then stopped at baseline
observer startup. The canonical exception fields were preserved, proving
the formatter fix; no clean-state, L1 PRE, retry or mutation followed.
