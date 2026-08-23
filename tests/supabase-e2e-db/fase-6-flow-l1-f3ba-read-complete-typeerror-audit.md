# F3BA - READ_COMPLETE TypeError audit

F3BA was audit-only. No verifier, target, coordinator, inspector, or remote
operation was executed.

## Provenance

`READ_COMPLETE` is the progress marker assigned by the local `read()` helper
after `runBaselineRead()` returns and counters are updated. The F3AZ fail-closed
boundary makes each synthetic read fail with an empty `rows` array. After the
seventeenth read, `relationsOk()` completes and `quantitativeOkFn()` receives
an empty `items` array.

`quantitativeOkFn()` then computes `b` with
`x.items.find(i => i.code === 'E2E_ITEM_BULK')` and immediately reads
`b.stock_available`. With no item row, `b` is undefined, producing the
subsequent TypeError. This is distinct from the repaired `env` binding.

The evidence supports a fail-closed synthetic-input shape defect in the E2E
verifier path, not a remote or DNS failure. The exact TypeError message and
stack were not persisted by F3AZ.

## Fix design only

A future scoped phase could add a defensive missing-record guard around the
quantitative invariant input and preserve a structured failure instead of
throwing. That would touch the amended frozen verifier file and requires a
separate freeze exception. No such change was made in F3BA.
