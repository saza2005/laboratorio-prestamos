# FASE 6.3B-L1-F3U

## Alcance

F3U fue una auditoria local y network-free. No ejecuto DNS, HTTP, TLS,
baseline, clean-state, PRE, browser, RPC ni mutacion.

## Grafo y presupuesto

El preflight historico tuvo un baseline top-level explicito y dos invocaciones
top-level de clean-state. Cada clean-state lanza internamente un baseline en un
proceso Node separado. Por tanto, la reconstruccion es:

```text
explicit baseline top-level=1
clean-state top-level=2
baseline nested inside clean-state=2
post-failure clean-state=1
reconstructed baseline total=3
reconstructed clean-state total=2
process model=SEPARATE_NODE_PROCESSES
```

El modelo futuro debe separar `TOP_LEVEL_SCRIPT_INVOCATIONS` de
`NESTED_INTERNAL_VERIFIER_EXECUTIONS`, con limites maximos declarados para
ambos. La desviacion historica queda preservada como
`NESTED_VERIFIER_BUDGET_UNDERSPECIFIED_PLUS_POST_FAILURE_EXECUTION`.

## Red y captura local

F3T usa `globalThis.fetch` directamente. L1 crea un cliente Supabase con la
cadena `supabase-js fetchWithAuth -> global fetch`; PostgREST recibe ese
wrapper y termina llamandolo. No hay custom fetch, dispatcher, Agent ni proxy
alternativo. Baseline y clean-state usan la misma fabrica y la misma cadena.

La captura sintetica del builder real `requests.select(purpose,comments)`
paso sin red: host E2E, metodo GET, headers auth/apikey presentes por el
wrapper, dispatcher custom ausente. La observacion pasiva es neutral y no
modifica fetch, DNS o dispatcher.

```text
L1_F3U_POSTGREST_NETWORK_FREE_CAPTURE_USED=yes
L1_F3U_POSTGREST_CAPTURE_NETWORK_REACHABILITY=0
L1_F3U_CAPTURE_HOST_EQUALS_E2E=yes
L1_F3U_CAPTURE_METHOD_CLASS=GET
L1_F3U_CAPTURE_CUSTOM_DISPATCHER_PRESENT=no
L1_F3U_PASSIVE_OBSERVER_NETWORK_PATH_NEUTRALITY_TEST=PASS
```

## Resultado

No se encontro un defecto estatico especifico de L1 en target, dispatcher,
fetch subyacente, agente, proxy, auth wrapper o observador. Con los procesos
separados y los fallos DNS intermitentes historicos, la clasificacion es
`PROCESS_BOUNDARY_WITH_INTERMITTENT_DNS` con confianza media.

No se cambio el runtime congelado ni se autoriza otro PRE automaticamente.

## F3V feasibility result

The current verifier shells are CLI-only and the clean-state shell invokes
baseline through a child process. F3V therefore requires minimal core
extraction before a single-process coordinator can be implemented. No frozen
runtime file was changed.

## F3W implementation result

The CLI-only entrypoints were refactored into reusable cores plus backward-
compatible wrappers. The coordinator uses one Node process, multiple clients,
and no child verifier processes. This is an architectural change only; DNS
has not been revalidated or claimed fixed.

F3X executed the coordinator once and stopped at baseline failure. Clean-
state and L1 PRE cores were not run, preserving the no-repeat and no-
post-failure-check budget.
