# FASE 4 — Creación aislada de C2

## 1. Entorno

- Proyecto: Supabase E2E
- Project Ref parcialmente oculto: rwni********wwim
- Rama: chore/e2e-supabase-baseline
- Script: scripts/e2e/create-test-data.mjs
- Dependencias modificadas: no

## 2. Actor e identidad

- Alias: e2e_lab_staff
- Rol: lab_staff
- Variables utilizadas: E2E_LAB_STAFF_EMAIL, E2E_LAB_STAFF_PASSWORD
- Variables incorrectas utilizadas: ninguna
- Borrower: e2e_student
- Operator: e2e_lab_staff
- auth.uid: coincide con operador y receptor
- Coincidencia: sí
- Sesión persistida: no

## 3. Preflight

- Ejecutado: sí, solo lectura
- Código: 0
- Loans antes: 1
- Returns antes: 0
- Stock bulk antes: 9/10
- C1: ALREADY_EXISTS_MATCHING, intacto
- C2: WOULD_CREATE_AND_RETURN_PARTIAL
- C3 alcanzable: no
- Conflictos: ninguno

## 4. Creación de préstamo

- Ejecutada: sí
- RPC: create_multi_item_loan_transaction(uuid,jsonb,date,text,uuid)
- Invocaciones: 1
- UUID retornado: sí, no mostrado
- Loan status inicial: active
- Quantity: 2
- Returned inicial: 0
- Pending inicial: 2
- Error: ninguno

## 5. Devolución parcial

- Ejecutada: sí
- RPC: register_return_transaction(uuid,integer,integer,integer,text,uuid)
- Invocaciones: 1
- Return creado: sí
- Return item creado: sí
- Loan status final: partial_return
- Returned final: 1
- Pending final: 1
- Error: ninguno

## 6. Estado local

- test-data.json actualizado: sí
- Lotes A/B conservados: sí
- C1 conservado: sí
- Solo C2 añadido: sí
- Ignorado: sí
- Permisos: 600
- Secretos: 0
- Tokens: 0
- Sesiones: 0

## 7. Verificación posterior

- Loans: 2
- Loan items: 2
- Returns: 1
- Return items: 1
- C1: activo, cantidad 1, devuelto 0, pendiente 1
- C2: partial_return, cantidad 2, devuelto 1, pendiente 1
- Duplicados: no
- Conflictos: no
- Dry-run posterior: ALREADY_EXISTS_MATCHING, código 0

## 8. Inventario y movimientos

- Bulk inicial: 9/10
- Bulk después del préstamo: 7/10
- Bulk final: 8/10
- Tracked: 2/2
- Item units: sin cambios, good/available
- Movimientos anteriores: 1
- Movimientos nuevos: 2
- Tipos: loan_out cantidad 2; return_ok cantidad 1
- Consistencia: sí

## 9. Alcance y seguridad

- Solicitudes modificadas: no
- C1 modificado: no
- C3 ejecutado: no
- Maintenance: 0
- Staging: 0
- Proyecto normal modificado: no
- Proyecto E2E modificado: sí, únicamente por las dos RPC autorizadas
- Sesiones almacenadas: no
- Secretos mostrados: no
- Staging Git: no
- Commit: no

## 10. Conclusión

- Creación C2 completa: sí
- Préstamo creado: sí
- Devolución parcial registrada: sí
- C2 partial_return: sí
- Inventario consistente: sí
- C1 intacto: sí
- Listo para preparar C3: sí
- Requiere autorización: sí, autorización independiente para C3
- Problemas pendientes: ninguno para C2
- Siguiente paso: detenerse y esperar autorización para C3
