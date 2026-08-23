# FASE 4 — Verificación final del baseline E2E

## 1. Entorno

- Proyecto: Supabase E2E.
- Project Ref parcialmente oculto: rwni********wwim.
- Rama: chore/e2e-supabase-baseline.
- Scripts: create-users.mjs, create-profiles.mjs, create-test-data.mjs, verify-baseline.mjs.
- Dependencias modificadas: no.

## 2. Estado local

- auth-users state: válido, 4 alias, permisos 600, ignorado.
- profiles state: válido, 4 alias, permisos 600, ignorado.
- test-data state: válido, lotes A/B/C/D, permisos 600, ignorado.
- Permisos: 600 en los tres archivos.
- Ignorados: sí.
- Hashes: conservados durante la validación; registrados en el manifiesto.
- Secretos: 0.

## 3. Auth y profiles

- Auth users: 4.
- Profiles: 4.
- Roles: admin, lab_staff, teacher, student.
- UUID coinciden: sí.
- Confirmación: los cuatro correos confirmados.
- Metadata: E2E correcta.
- is_active: true en los cuatro.
- Conflictos: ninguno.

## 4. Inventario

- Items: 2.
- Units: 2.
- Bulk: consumable/active, total 10, disponible 8.
- Tracked: equipment/active, total 2, disponible 1.
- Unit 001: maintenance/unavailable.
- Unit 002: good/available.
- Invariantes: PASS; stocks no negativos y unidades sin duplicados.
- Conflictos: ninguno.

## 5. Solicitudes

- Requests: 4.
- Request items: 4.
- Groups: 1.
- Group items: 1.
- Pending: E2E_REQUEST_STUDENT_PENDING.
- Rejected: E2E_REQUEST_STUDENT_REJECTED.
- Delivered: solicitud de C1.
- Group pending: E2E_REQUEST_TEACHER_GROUP.
- Conflictos: ninguno.

## 6. Préstamos y devoluciones

- Loans: 3.
- Loan items: 3.
- Returns: 2.
- Return items: 2.
- C1: active, 1 prestado, 0 devuelto, 1 pendiente.
- C2: partial_return, 2 prestados, 1 devuelto, 1 pendiente.
- C3: returned, 1 prestado, 1 devuelto, 0 pendiente.
- Cantidades: PASS.
- Relaciones: PASS.
- Conflictos: ninguno.

## 7. Mantenimiento y movimientos

- Maintenance: 1.
- D1: preventive; unidad 001; maintenance/unavailable.
- Movimientos: 6.
- Tipos: 3 loan_out, 2 return_ok, 1 adjustment_down.
- Cantidades: PASS.
- Relaciones: PASS.
- Duplicados: ninguno.
- Conflictos: ninguno.

## 8. Seguridad

- Staging: las tres tablas vacías.
- Secretos: 0 encontrados en state.
- Sesiones: 0 persistidas.
- State rastreado: no; archivos ignorados.
- Permisos: 600.
- Proyecto normal: no consultado ni modificado.
- Escrituras durante esta auditoría: 0.
- RPC durante esta auditoría: 0.

## 9. Validador

- Ruta: scripts/e2e/verify-baseline.mjs.
- Auditoría estática: PASS.
- Ejecutado: sí, con --confirm-e2e.
- Código: 0.
- PASS: 19 secciones, incluyendo invariantes cuantitativas.
- FAIL: 0.
- WARNING: 1, audit_logs con 0 filas; no bloqueante.
- Resultado final: PASS.

## 10. Conclusión

- Baseline íntegro: sí.
- Datos E2E completos: sí.
- FASE 4 completada: sí.
- Listo para pruebas automatizadas: sí.
- Problemas pendientes: ninguno bloqueante.
- Siguiente fase: FASE 5, pruebas automatizadas; esta tarea no ejecutó Playwright.
