# FLOW-R2 - Execution plan

Plan exclusivamente futuro; no se ejecuta en 6.2B.

1. Verify baseline, storageState, clean-state y guard.
2. Seed con estrategia A usando actor student y marker `E2E_MUT_REQ_R2_`.
3. Registrar atómicamente request_id y request_item IDs.
4. Verificar stage `seeded` y pre-action rehearsal PASS.
5. Ejecutar el rechazo exactamente una vez con admin y `--no-deps`.
6. Verificar status rejected, reason, reviewer y deltas secundarios.
7. Cleanup administrativo exacto de request_item y request.
8. Verificar post-cleanup, clean-state, baseline y storageState.

Seed writes, action writes y cleanup writes deben reportarse por separado. Un fallo después de seed o reject bloquea cualquier flujo posterior hasta recovery.
