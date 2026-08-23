# FASE 5 — Validación manual de logins y roles

## 1. Entorno

- Proyecto: Supabase E2E.
- Project Ref parcialmente oculto: rwni********wwim.
- Rama: chore/e2e-supabase-baseline.
- Baseline inicial: PASS.
- Aplicación: Next.js local en localhost:3000.
- Target: Supabase E2E.
- Dependencias modificadas: no.

## 2. Contrato de acceso

- Ruta del contrato: tests/supabase-e2e-db/fase-5-role-access-contract.md.
- Rutas públicas: /, /auth/login, /auth/register y callback sin sesión.
- Rutas autenticadas: dashboard operativo para admin/lab_staff; portal de solicitudes para teacher/student.
- Restricciones admin: sustentadas por guards de código; login/redirección verificados manualmente.
- Restricciones lab_staff: sustentadas por guards de código; login/redirección verificados manualmente.
- Restricciones teacher: sustentadas por guards de código; login/redirección verificados manualmente.
- Restricciones student: sustentadas por guards de código; login/redirección verificados manualmente.
- Incertidumbres: rutas adicionales y restricciones no fueron marcadas como manualmente verificadas si el usuario no las probó.

## 3. Admin

- Login: LOGIN_PASS.
- Redirección: /dashboard.
- Profile: correcto.
- Rol: ROLE_PASS; Administrador/admin.
- Acceso permitido adicional: sustentado por contrato, no marcado como prueba manual.
- Acceso restringido: no probado manualmente.
- Logout: LOGOUT_PASS.
- Sesión posterior: eliminada.
- Resultado: PASS.

## 4. Lab staff

- Login: LOGIN_PASS.
- Redirección: /dashboard.
- Profile: correcto.
- Rol: ROLE_PASS; Laboratorista/lab_staff.
- Acceso permitido adicional: sustentado por contrato, no marcado como prueba manual.
- Acceso restringido: no probado manualmente.
- Logout: LOGOUT_PASS.
- Sesión posterior: eliminada.
- Resultado: PASS.

## 5. Teacher

- Login: LOGIN_PASS.
- Redirección: /solicitudes.
- Profile: correcto.
- Rol: ROLE_PASS; Docente/teacher.
- Acceso permitido adicional: sustentado por contrato, no marcado como prueba manual.
- Acceso restringido: no probado manualmente.
- Logout: LOGOUT_PASS.
- Sesión posterior: eliminada.
- Resultado: PASS.

## 6. Student

- Login: LOGIN_PASS.
- Redirección: /solicitudes.
- Profile: correcto.
- Rol: ROLE_PASS; Estudiante/student.
- Acceso permitido adicional: sustentado por contrato, no marcado como prueba manual.
- Acceso restringido: no probado manualmente.
- Logout: LOGOUT_PASS.
- Sesión posterior: eliminada.
- Resultado: PASS.

## 7. Separación de sesiones

- Ventanas privadas: usadas entre cuentas, según confirmación manual.
- Cookies entre cuentas: sin contaminación.
- Contaminación: no.
- Sesión posterior al logout: eliminada en los cuatro casos.
- StorageState: no generado.
- Tokens persistidos/exportados: no.
- Archivos de cookies o sesiones: no encontrados.

## 8. Efectos Auth

- Usuarios: 4.
- UUID: intactos y coincidentes con state.
- Confirmación: 4 confirmados.
- Metadata: E2E correcta.
- last_sign_in_at: puede haber cambiado como efecto esperado del login; no se exportaron timestamps.
- Profiles: 4.
- Roles: intactos.
- is_active: intacto y activo en los cuatro.
- Efectos esperados: sesión temporal y metadatos Auth de inicio de sesión.
- Efectos inesperados: ninguno.

## 9. Integridad de datos

- Baseline posterior: PASS.
- Código: 0.
- State hashes: conservados.
- Datos A/B/C/D: íntegros; items 2, units 2, requests 4, request items 4, groups 1/1, loans 3/3, returns 2/2, maintenance 1, movements 6.
- RPC de negocio: 0.
- Escrituras public: 0.
- Staging: vacío.
- Proyecto normal: no consultado ni modificado.

## 10. Seguridad

- Credenciales mostradas: no.
- Tokens mostrados: no.
- Cookies exportadas: no.
- Sesiones almacenadas: no.
- StorageState generado: no.
- Playwright ejecutado: no.
- Acciones de escritura ejecutadas: 0.
- Secretos en informes: 0.

## 11. Cierre

- Aplicación detenida: sí.
- Puerto liberado: sí.
- Procesos huérfanos: ninguno observado.
- Dependencias: sin cambios.
- Staging Git: no realizado.
- Commit: no realizado.

## 12. Conclusión

- Admin válido: sí.
- Lab staff válido: sí.
- Teacher válido: sí.
- Student válido: sí.
- Roles correctos: sí.
- Accesos iniciales/redirecciones por rol: sí, verificados manualmente.
- Rutas adicionales y restricciones: sustentadas por contrato de código, no todas probadas manualmente.
- Logout correcto: sí.
- Sesiones separadas: sí.
- Baseline íntegro: sí.
- FASE 5.1B completada: sí.
- Listo para preparar storageState de Playwright: sí, como siguiente fase autorizada.
- Problemas pendientes: ninguno bloqueante.
- Siguiente paso: preparar storageState únicamente con autorización de la fase correspondiente.
