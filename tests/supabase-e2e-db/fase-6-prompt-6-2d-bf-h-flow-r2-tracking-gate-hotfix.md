# FASE 6 — Hotfix tracking gate browser-first FLOW-R2

## 1. Estado inicial
Baseline, storageState y clean-state PASS. El proyecto remoto estaba limpio y el state local CLEAN. El fixture de 6.2D-BF ya había sido limpiado y no se recuperó.

## 2. Auditoría de referencias
El schema compartido de `scripts/e2e/lib/mutating-state.mjs` inicializa y confirma `remote_write_confirmed`. Seed y los readers existentes usan el mismo campo. La única referencia runtime inválida era `seed_write_confirmed` en el gate del browser-armed test; las menciones restantes son documentación histórica o pruebas negativas locales.

## 3. Root cause
Clasificación A: nombre inventado en la nueva rama browser-first, por no reutilizar el nombre canónico del state compartido. No fue un cambio del schema ni una incompatibilidad remota.

## 4. Hotfix
Se añadió `scripts/e2e/lib/flow-r2-state-gate.mjs`, un validador puro y estricto. Exige FLOW-R2 activo, namespace, request_id, marker, `remote_write_confirmed=true` y `cleanup_required=true`. El browser test reutiliza este gate; no acepta alias ni fallback.

## 5. Validación local
Los negative tests rechazan campo falso, ausente, alias inválido, request_id ausente, flow incorrecto y cleanup no requerido; el estado completo se acepta. Node checks, TypeScript y ESLint PASS. La auditoría del runtime path deja cero referencias al alias inválido.

## 6. Validaciones READ_ONLY
El orchestrator real obtuvo un modo dry-run allowlisted: un browser test, cero auth dependencies, cero segundos browsers y cero writes. Seed dry-run, cleanup dry-run con targets 0, verifier R2 pre y runner R1/R2 dry-run PASS. No se ejecutó Playwright en esta fase porque el cambio solo afecta la lectura/gate del state posterior a FIXTURE_READY y no modifica path, child env ni lifecycle.

## 7. Integridad y seguridad
Remote writes=0, RPC negocio=0, state CLEAN, residual MUTATING=0. No se modificaron storageState, dependencias, sandbox, bubblewrap ni el proyecto normal. No se expusieron secretos, UUIDs ni markers completos.

## 8. Conclusión
El tracking gate browser-first queda corregido para usar una única verdad canónica. La evidencia previa de browser-first handshake y post-ready permanece válida; queda preparado el próximo intento real de FLOW-R2 con seed únicamente después de BROWSER_READY.
