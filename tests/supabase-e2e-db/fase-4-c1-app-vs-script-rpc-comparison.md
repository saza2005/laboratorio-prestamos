# Comparación aplicación vs script C1

| aspect | application_value | script_value | match | risk | correction_required | evidence |
|---|---|---|---|---|---|---|
| request argument | requestId from form | approved request id from state/catalog | yes | low | no | app/dashboard/solicitudes/actions.ts |
| units JSON | units array | [] for bulk | yes | low | no | active five-argument overload |
| items JSON | request_item_id, item_id, quantity | same keys and quantity 1 | yes | low | no | function jsonb_to_recordset |
| delivered_by | authenticated user.id | lab_staff profile UUID | value correct | high if session differs | yes | function requires p_delivered_by=auth.uid() |
| authenticated session | getAuthProfile session | script previously authenticated e2e_teacher for lab_staff alias | no | high | yes | create-test-data.mjs actor mapping |
| notes | delivery notes | E2E_LOAN_ACTIVE | yes | low | no | application action |
| return shape | UUID consumed as loan id | UUID required and checked | yes | low | no | catalog/inventory comparison |

Root cause was the session identity mismatch, not JSON structure or return handling.
