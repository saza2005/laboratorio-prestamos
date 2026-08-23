# Auditoría de parámetros C2

| parameter | source | expected_entity | validated | notes |
|---|---|---|---|---|
| p_user_id | profile state `e2e_student` | borrower | sí | UUID del prestatario E2E |
| p_items[].item_id | item state `E2E_ITEM_BULK` | item bulk | sí | sin unidad patrimonial |
| p_items[].quantity | payload C2 | loan quantity | sí | 2 |
| p_expected_return_date | fecha futura calculada localmente | expected return date | sí | no vencida |
| p_notes | alias `E2E_LOAN_PARTIAL_RETURN` | idempotency marker | sí | prefijo E2E |
| p_delivered_by | profile state `e2e_lab_staff` | authenticated operator | sí | coincide con `auth.uid()` |
| p_loan_item_id | `loan_items` derivado del préstamo C2 | loan item | sí | no se confundió con `loan_id` |
| p_quantity_ok | payload de devolución parcial | returned quantity | sí | 1 |
| p_quantity_damaged | payload de devolución parcial | damaged quantity | sí | 0 |
| p_quantity_missing | payload de devolución parcial | missing quantity | sí | 0 |
| p_received_by | profile state `e2e_lab_staff` | authenticated receiver | sí | coincide con `auth.uid()` |
