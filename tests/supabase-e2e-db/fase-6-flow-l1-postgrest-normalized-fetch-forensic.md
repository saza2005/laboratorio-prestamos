# FLOW-L1 F3E - PostgREST normalized fetch forensic

## F3F outcome

The integrated complete-verifier observation confirmed the installed normalization path in the live environment: the underlying requests fetch rejected with a sanitized DNS-resolution fingerprint and the PostgREST result exposed a structured error with no HTTP response. This is transport rejection observed in the complete verifier, not proof of a server semantic response. F3F stopped after its single permitted tapped execution.

## Installed implementation

```text
@supabase/supabase-js=2.101.1
@supabase/postgrest-js=2.101.1
Node=v24.14.1
```

The installed `PostgrestBuilder` catches fetch rejection when `throwOnError` is false and normalizes it to `data=null`, a structured error, `status=0`, and empty `statusText`. A resolved non-2xx response retains HTTP status and server error; a resolved 2xx response produces data.

## Local validation

The transparent diagnostic fetch tap returns the exact response object and rethrows the exact error object without changing request method, headers, body, or signal. Secret redaction tests pass. Synthetic fetch rejection, HTTP 4xx, and HTTP 200 cases are distinguishable.

## Remote sequence

The one canonical requests observation used production client factory, production query, production `readTable`, and the diagnostic fetch tap:

```text
FETCH_RESOLUTION=RESOLVED
FETCH_HTTP_STATUS_CLASS=HTTP_2XX
POSTGREST_DATA_CLASS=ARRAY
POSTGREST_ERROR_PRESENT=no
```

The subsequent single complete L1 PRE verifier, without the tap, failed again on `L1_PRE_REQUESTS` with `SUPABASE_RESULT_ERROR_OBJECT`. It was not possible in this authorization to prove whether that result came from a native fetch rejection normalized by PostgREST-js or another runtime request condition.

```text
L1_F3D_STRUCTURED_RESULT_PROVES_SERVER_ERROR=no
L1_F3E_PRE_REMOTE_LEADING_CLASS=POSTGREST_JS_NORMALIZED_FETCH_FAILURE_POSSIBLE
L1_F3E_CURRENT_ERROR_ORIGIN=INSUFFICIENT_EVIDENCE
L1_F3E_CURRENT_ERROR_CLASS=SUPABASE_RESULT_ERROR_OBJECT
L1_F3E_CURRENT_ERROR_CLASS_CONFIDENCE=MEDIUM
L1_PRE_READ_FAILURE_FORENSIC_STATUS=OPEN
L1_QUANTITY_CONTROL_FORENSIC_STATUS=OPEN
FLOW_L1_OFFICIAL_STATUS=OPEN
BASELINE_RESTORED=yes
STATE=CLEAN
```

No loans read, final preflight, browser, fixture, business RPC, cleanup, or remote write occurred after the failed complete verifier.
