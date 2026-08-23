# FLOW-R1 - Plan de ejecucion futura

Esta fase no ejecuta el flujo.

1. PRECHECK: guard MUTATING, clean-state, baseline y storageState PASS.
2. GENERATE CORRELATION: crear marcador unico con prefijo E2E_MUT_REQ_R1_.
3. PERSIST LOCAL PREWRITE STATE: registrar marker, actor, item y cantidad con request_id null.
4. RUN: runner con --confirm-e2e --flow=FLOW-R1 --execute y confirmacion especifica.
5. PRIMARY ID CAPTURE: registrar el ID exacto en state atomicamente tras el redirect y lectura de detalle.
6. EXACT RECOVERY IF NEEDED: si el ID no fue capturado, resolver por marker exacto; cero o mas de una coincidencia detiene segun contrato.
7. REGISTER REMOTE ID: marcar cleanup_required antes de cualquier paso posterior.
8. VERIFY DELTA: confirmar requests +1, request_items +1 y resto intacto.
9. CLEANUP: ejecutar por separado cleanup allowlisted del ID exacto.
10. VERIFY POST-CLEANUP: confirmar ausencia de la entidad y sus hijos.
11. VERIFY CLEAN STATE: residual MUT_*=0 y state limpio.
12. VERIFY BASELINE: verify-baseline.mjs PASS.
13. VERIFY STORAGESTATE: cuatro estados PASS y hashes conservados.

No se permite pasar al siguiente flujo si una etapa falla. Si la escritura ocurre y el test falla, el proceso queda en CLEANUP_REQUIRED.

## Prerequisito UI
Antes de GENERATE CORRELATION y RUN MUTATING debe ejecutarse el contrato UI READ_ONLY:
FLOW_R1_UI_CONTRACT: PASS
Debe utilizar storageState cacheado, --no-deps y retries=0, sin submit.

## Prerequisito de ensayo completo
Antes de preparar correlation state y ejecutar MUTATING debe pasar FLOW_R1_FULL_PRE_SUBMIT_REHEARSAL: PASS, usando el helper comun y sin submit.

## Prerequisito state machine
Antes de cualquier full rehearsal se requiere UI_STATE_MACHINE_RUNTIME: PASS y STATIC_RUNTIME_STATE_MACHINE_MATCH: PASS. La validacion completa posterior debe autorizarse en una fase independiente.


## Prerequisito de ejecucion actualizado
FULL PRE-SUBMIT REHEARSAL PASS -> VERIFY CLEAN STATE -> GENERATE CORRELATION -> PERSIST PREWRITE STATE -> RUN FLOW-R1 -> TRACK/RECOVER ID -> VERIFY DELTA -> CLEANUP EXACT ID -> VERIFY BASELINE
