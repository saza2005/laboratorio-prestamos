# FASE 3.3 — Plan de validacion de permisos

1. Crear una migracion local especifica con las cinco revocaciones propuestas, sin modificar cuerpos, firmas, RLS, policies ni tablas.
2. Ejecutar `supabase db reset --local --no-seed`.
3. Verificar por catalogos que las cinco funciones tengan `authenticated=false` y que PUBLIC/anon sigan en `false`.
4. Verificar que las RPC activas conserven `authenticated=true`, incluyendo `create_multi_item_loan_transaction` y la variante de entrega con cinco argumentos.
5. Verificar `service_role=true` para las 24 funciones.
6. Ejecutar lint local y confirmar cero errores y ningun warning nuevo.
7. Ejecutar `supabase db diff --local --schema public` y revisar que no haya cambios estructurales.
8. Ejecutar pruebas read-only y de flujo para prestamos multi-item, entrega con unidades, inventario y devoluciones.
9. Confirmar nuevamente PUBLIC=false y anon=false para las 24 funciones.
10. Ejecutar `supabase db push --dry-run` contra E2E y comprobar que proponga solo la nueva migracion.
11. Revisar el diff remoto y solicitar autorizacion explicita antes del push real.
12. Tras el push autorizado, comparar ACL local/E2E y repetir las pruebas de los flujos activos.

No ejecutar la propuesta `.review` directamente ni crear la migracion hasta aprobar este alcance.
