# Auditoría estática del script de datos E2E

- Batch C dry-run: solo SELECT.
- INSERT alcanzable en dry-run: no.
- UPDATE/DELETE/UPSERT en dry-run: no.
- RPC alcanzable en dry-run: no.
- Entrega, préstamo, devolución y mantenimiento en dry-run: no.
- Staging/proyecto normal: no.
- Secretos hardcodeados: 0.
- Consultas limitadas a E2E: sí.
- Préstamos separados: sí.
- Unidades duplicadas: no; C1-C3 usan bulk.
- Cantidades válidas: sí.

## Batch C2 aislado

- Escenario admitido: --batch=C --scenario=C2.
- Dry-run: solo SELECT; INSERT/UPDATE/DELETE/UPSERT: no.
- RPC en dry-run: no.
- Execute C2: únicamente create_multi_item_loan_transaction y register_return_transaction.
- C1/C3 alcanzables en la ruta aislada: no.
- Actor de negocio: e2e_lab_staff; borrower: e2e_student.
- Unidades patrimoniales utilizadas: no.
- Tablas staging/proyecto normal: no.

## Batch C3 aislado

- Escenario admitido: --batch=C --scenario=C3.
- Dry-run: solo SELECT; INSERT/UPDATE/DELETE/UPSERT: no.
- RPC en dry-run: no.
- Execute C3: únicamente create_multi_item_loan_transaction y register_full_return_transaction.
- C1/C2 alcanzables en la ruta aislada: no.
- Actor de negocio: e2e_lab_staff; borrower: e2e_student.
- Unidades patrimoniales utilizadas: no.
- Tablas staging/proyecto normal: no.


## Batch D dry-run

- INSERT alcanzable: no.
- UPDATE/DELETE/UPSERT alcanzable: no.
- RPC alcanzable en dry-run: no.
- Mantenimiento y cambio de unidad alcanzables en dry-run: no.
- Préstamo/devolución en la ruta D1: no.
- E2E_ITEM_TRACKED-002 modificable: no.
- Lotes A/B/C modificables: no.
- Staging/proyecto normal: no.
- Secretos hardcodeados: 0.
- Consultas limitadas a E2E: sí.