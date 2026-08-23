# FLOW-L1 F3D - Supabase result error forensic

## F3F clarification

F3F correlated the structured result with the original transport boundary. The live fetch rejected with a DNS-resolution fingerprint, while `postgrest-js` returned the normalized fulfilled result (`data=null`, no HTTP status). The prior F3D structured-result failure is preserved and is not rewritten as a server error.

## F3E result

Installed PostgREST-js normalizes fetch rejection to a structured result with status zero. The one remote canonical observation with a transparent tap resolved HTTP 2xx and array data; the complete verifier without the tap failed again. The failing fetch boundary remains unproven.

## Result

The canonical requests probe now reuses the production `readTable` implementation and production query constants. It failed once with:

```text
L1_F3D_CANONICAL_REQUESTS_REMOTE_PROBE=FAIL
L1_F3D_CANONICAL_REQUESTS_RESULT_BOUNDARY_CLASS=SUPABASE_RESULT_ERROR_OBJECT
L1_F3D_CANONICAL_REQUESTS_ERROR_CODE_CLASS=PRESENT_UNSAFE_OR_UNOBSERVED
L1_F3D_CANONICAL_REQUESTS_ERROR_STANDARD_CODE=REDACTED_NONSTANDARD
L1_F3D_CANONICAL_REQUESTS_ERROR_MESSAGE_CLASS=UNKNOWN
L1_F3D_CANONICAL_REQUESTS_ERROR_SAFE_SUMMARY=structured Supabase result error; raw text withheld
```

The safe boundary was a fulfilled promise, nullish data, and error own keys `code`, `details`, `hint`, and `message`. The error remained nonretryable. No loans probe, complete verifier, or final preflight was run after this failure.

## Canonical implementation

`scripts/e2e/lib/l1-pre-readtable.mjs` now owns the query constants and `readTable`. Both the L1 verifier and diagnostic probe import that module, so the probe cannot silently bypass the canonical query, client, result boundary, or retry handling.

Local tests pass for normal results, structured errors, empty errors, query equivalence, argument shape, sequential fail-fast behavior, and retry reachability `0` for Supabase result errors. No query semantics, verifier targets, business invariants, or retryable classes changed.

The observed result is consistent with a server-side structured result error, but the redacted semantic values were not sufficient to prove a specific SQL/PostgREST code or message class without exposing unsafe content. The exact semantic cause remains unresolved.

```text
L1_F3D_LOCAL_ROOT_CAUSE=SUPABASE_RESULT_ERROR_OBJECT
L1_F3D_LOCAL_ROOT_CAUSE_CONFIDENCE=HIGH
L1_PRE_QUERY_CORRECTION_REQUIRED=no
L1_PRE_QUERY_SET_CHANGED=no
L1_PRE_READ_FAILURE_FORENSIC_STATUS=OPEN
L1_QUANTITY_CONTROL_FORENSIC_STATUS=OPEN
FLOW_L1_OFFICIAL_STATUS=OPEN
BASELINE_RESTORED=yes
STATE=CLEAN
```
