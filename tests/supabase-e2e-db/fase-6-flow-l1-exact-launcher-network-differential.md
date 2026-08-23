# FASE 6.3B-L1-F3T

## Alcance

F3T fue un diagnostico local con el mismo lanzamiento DIRECT_NODE, Node,
cwd y carga de entorno usados por el verificador. No ejecuto PRE, cliente
Supabase, PostgREST, RPC, browser ni mutacion.

Se ejecutaron exactamente cuatro operaciones de red autorizadas: un
`dns.lookup` para el control, un `dns.lookup` para el objetivo E2E, y un
HEAD para cada origen. No hubo reintentos, backoff ni bucles de sondeo.

## Resultado

```text
L1_F3T_DIAGNOSTIC_TOOL_READY=yes
L1_F3T_PASSIVE_OBSERVER_READY=yes
L1_F3T_CONTROL_DNS_RESULT=PASS
L1_F3T_E2E_DNS_RESULT=PASS
L1_F3T_CONTROL_FETCH_TRANSPORT_RESULT=PASS
L1_F3T_E2E_ORIGIN_FETCH_TRANSPORT_RESULT=PASS
L1_F3T_E2E_ORIGIN_FETCH_HTTP_RESPONSE_PRESENT=yes
L1_F3T_E2E_FETCH_PASSIVE_HOST_CLASS=E2E_SUPABASE_HOST
L1_F3T_UNEXPECTED_HOST_MISMATCH=no
L1_F3T_E2E_FETCH_RAW_CORRELATION_VALID=yes
L1_F3T_DNS_LOOKUP_RETRY_EXECUTIONS=0
L1_F3T_HTTP_RETRY_EXECUTIONS=0
L1_F3T_TOTAL_REMOTE_NETWORK_OPERATIONS=4
L1_F3T_SUPABASE_CLIENT_TABLE_READ_REACHABILITY=0
L1_F3T_POSTGREST_QUERY_EXECUTIONS=0
L1_F3T_RPC_EXECUTIONS=0
```

El resultado es `EXACT_LAUNCHER_NETWORK_CURRENTLY_HEALTHY`. Esto no
reinterpreta ni demuestra resuelta la intermitencia historica observada en
F3R/F3P.

El fingerprint previo al diagnostico mantuvo las compuertas de ejecutable,
cwd, entorno, defaults DNS, fetch y seguridad. El freeze
`POST_F3O_DNS_BACKOFF_VALIDATED` permanecio valido.

## Seguridad y siguiente paso

El script standalone no contiene autenticacion, API key, ruta de tabla,
RPC ni reintento. No se imprimieron valores de host, URL, IP o secretos.
No se autoriza otro PRE automaticamente. El siguiente paso requiere una
decision explicita de confiabilidad que preserve la historia DNS.

## Final preflight relation

The later single hardened preflight failed again in the production L1 PRE
path after the authorized 1000 ms DNS backoff. This does not invalidate the
F3T result: F3T remains a healthy current exact-launcher sample, while the
historical and final PRE failures remain intermittent evidence.

## F3U comparison

F3U found that F3T direct fetch and L1 PostgREST fetch differ only by the
expected Supabase auth wrapper; both reach the same global fetch/Undici path.
No alternate agent, dispatcher, proxy, or target was found.

The F3X coordinator execution matched the F3W freeze but stopped at its
single baseline core failure. It therefore produced no new L1 network-path
observation.
