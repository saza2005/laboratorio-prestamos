# F3AW - Extended ReferenceError provenance

F3AW consumed exactly one local execution. No retry, runtime fix, or remote
operation occurred.

## Provenance

The paused event reported `ReferenceError: env is not defined` with reason
`promiseRejection`. The first frame is repository code at
`scripts/e2e/verify-baseline.mjs`, line 138, column 837, in
`validateStateFiles`. The captured call path is:

`validateStateFiles -> runBaselineCoreUnsafe -> runBaselineCore -> baselineCore -> runSingleProcessPreflight baseline call`

The passive script map resolved the throw script to the repository file and
preserved five structural frames. No async stack was present.

## Root classification

The failing expression calls `validateContext(env, state)` from
`validateStateFiles`, although `env` is not a parameter or in-scope binding in
that function. This is an undeclared/out-of-scope identifier in frozen
baseline runtime code. The baseline catches the same local error and exposes
`BASELINE_UNEXPECTED_LOCAL_EXCEPTION`; baseline completion is therefore false,
while the coordinator promise settles normally.

No fix was applied. The runtime freeze remained valid. A future phase must be
authorized separately for the minimal runtime correction and full regression.
