# FASE 6 — Diagnóstico boundary click -> Server Action FLOW-R2

## 1. Estado inicial
Baseline, storageState y clean-state PASS. No existía fixture R2 y no se ejecutó seed, reject ni cleanup mutante.

## 2. Cadena estática
La ruta dashboard/solicitudes renderiza RejectForm. El form usa useActionState(rejectRequestWithState), contiene request_id y rejection_reason y tiene onSubmit={confirmSubmit.onSubmit}. La Server Action valida rol y request_id, extrae rejection_reason y llama reject_request_transaction.

## 3. Root cause
Clasificación A: WRONG_CONFIRM_SELECTOR, con componente de confirmación de dos pasos. El locator exacto Rechazar encontrado antes del diálogo era el submit inicial, no el botón real del diálogo. Ese submit es cancelado por preventDefault; por eso no hubo POST, Server Action ni RPC.

## 4. Auditoría de datos
El binding UI/server action es coherente: hidden request_id y textarea rejection_reason usan los nombres esperados. No se modificó Server Action ni RPC. Los early returns están protegidos por rol y request_id inválido.

## 5. Diagnóstico runtime
El test diagnóstico instaló kill-switch para abortar todos los POST antes de navegar/interactuar. La ejecución mediante runner READ_ONLY fue intentada una sola vez; el storageState admin redirigió a login antes del confirm. Diagnostic click=0, POST=0, RPC=0, writes=0. No se repitió.

## 6. Hotfix
El helper futuro separa submit inicial y botón Rechazar del dialog. Después del confirm real espera request POST con metadata no sensible, response y navegación antes de publicar ACTION_DONE. Se elimina el falso positivo basado solo en click dispatch.

## 7. Tests y seguridad
Completion local tests, handshake tests, gate tests, TypeScript, Node checks y ESLint PASS. Seed/cleanup dry-run y R2 pre PASS; R1 regression PASS. No se registraron bodies, cookies, tokens ni IDs completos.

## 8. Estado final
Remote writes=0, business RPC=0, reject RPC=0, request updates=0, residuals=0, baseline PASS, storageState MATCH, state CLEAN. No procesos E2E ni puerto 3000 ocupado.

## 9. Conclusión
El boundary click -> Server Action queda diagnosticado y el false-positive ACTION_DONE eliminado estáticamente. La siguiente ejecución real requiere una autorización nueva y una referencia admin runtime válida.
