# F3AY - Baseline environment binding fix

F3AY consumed the authorized one-file freeze exception only. The fix passes
the existing validated `env` binding from `runBaselineCoreUnsafe()` into the
single `validateStateFiles()` caller and adds it to that helper's parameters.
No second environment load, `process.env` substitution, validation change, or
public interface change was introduced.

Pre-fix hash:

`4eb0d4a8c786ba8d31ee9dd64deb34e0f26e2501bfdc0f860bdec62d8472db75`

Post-fix hash:

`8c01160f64c06871c879ee489888749f71acd468568373357ea875c521cc0267`

All non-exempt freeze files remain unchanged. The logical post-fix reference is
`POST_F3AY_AMENDED_FREEZE`: the previous manifest with this authorized file
replaced by its post-fix hash.

Validation was parse/static-only. No baseline, coordinator, target, inspector,
or remote operation was executed.
