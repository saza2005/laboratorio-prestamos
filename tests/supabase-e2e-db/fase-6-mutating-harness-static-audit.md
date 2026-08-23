# FASE 6 - Auditoria estatica del harness MUTATING

- Guard: valida Project Ref E2E, env publico, baseline, storageState, state vacio y ausencia de namespace.
- State: esquema versionado, flow allowlisted, IDs exactos, escritura atomica y permisos 600.
- Clean-state: reusa baseline y anade escaneo read-only del namespace MUT_*.
- Flow verifier: solo pre-state autorizado en 6.1B; no escribe.
- Runner: FLOW-R1 allowlisted, project chromium-student, --no-deps, dry-run/list; no recibe service role ni credenciales.
- Cleanup: dry-run por defecto; rechaza IDs de CLI, patrones amplios, targets no registrados y ejecucion real en 6.1B.
- Privilege separation: browser/Next/Playwright no reciben credencial administrativa; cleanup futuro sera proceso separado.
- Failure recovery: estados RUNNING_NO_WRITE, WRITE_CONFIRMED, CLEANUP_REQUIRED y CLEANUP_FAILED bloquean continuacion cuando corresponde.
- Namespace: E2E_MUT_REQ_R1_ y prefijos definidos en 6.1A.
- Destructive patterns: no hay DELETE/TRUNCATE/SQL global en los nuevos scripts.
- Secrets: no se imprimen; state no contiene credenciales, tokens ni cookies.
- Permisos: state 600, carpeta E2E 700, destinos ignorados por Git.
- Ejecuciones: solo guards, clean-state, pre-state, dry-run y validaciones locales.
- Remote writes: 0; RPC de negocio: 0; Playwright mutante: 0.
