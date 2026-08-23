# FASE 6 - Runtime validation FLOW-R2

## 1. Estado inicial
Preflight completo PASS.

## 2. Seed
Un seed real: 1 RPC, 1 request y 1 request_item.

## 3. Fixture
Seeded verifier PASS; fixture pending y tracked.

## 4. UI rehearsal runtime
Un test READ_ONLY admin paso sobre el fixture real y localizo el rechazo sin pulsarlo.

## 5. Pending preservation
La request siguio pending. Reject RPC: 0.

## 6. Cleanup
Dry-run exacto y cleanup unico: 1 request_item y 1 request eliminados.

## 7. Restauracion
Post-cleanup, baseline, storageState y clean-state PASS; hashes MATCH.

## 8. R1 regression
R1 verifier pre y runner dry-run PASS.

## 9. Seguridad
No se ejecuto reject mutante ni se modificaron otras entidades.

## 10. Conclusion
Runtime rehearsal validado. Reject FLOW-R2 requiere autorizacion separada.
