# FASE 5 - Generación de storageState

## 1. Entorno

- Proyecto: Supabase E2E.
- Project Ref parcialmente oculto: rwni********wwim.
- Rama: chore/e2e-supabase-baseline.
- Playwright: 1.62.1.
- Baseline inicial: PASS, código 0.
- Proyecto normal: no consultado ni modificado.

## 2. Baseline inicial

- Validador: PASS.
- Escrituras remotas: 0.

## 3. Guard

- Entorno Auth: PASS.
- Project Ref: coincide.
- Chromium: disponible.
- Destinos iniciales: ausentes.
- Puerto 3000: libre.

## 4. Navegador

- Chromium instalado previamente: sí.
- Instalación ejecutada: no.

## 5. Separación de procesos

- Next.js: no recibió credenciales E2E ni service role.
- Playwright: entorno reducido; no recibió service role ni confirmaciones de escritura.

## 6. Auth admin

- Setup intentado: sí, una vez.
- Resultado: FAIL.
- Etapa: selección/envío del formulario.
- Causa: selector de botón no exacto coincidió con dos botones.
- StorageState: no generado.

## 7. Auth lab staff

- No ejecutado por detención ante el primer fallo.

## 8. Auth teacher

- No ejecutado por detención ante el primer fallo.

## 9. Auth student

- No ejecutado por detención ante el primer fallo.

## 10. Archivos generados

- Estados generados: 0.
- Carpeta: .e2e-state/playwright/, permisos 700.
- Archivos existentes antes: 0.

## 11. Validador

- Guard de storageState completo: no ejecutado tras el fallo.
- Estados presentes: 0.

## 12. Integridad posterior

- Baseline posterior: PASS, código 0.
- Auth users/profiles modificados: no.
- Datos public modificados: no.
- RPC de negocio: 0.

## 13. Artifacts y seguridad

- Artifacts de fallo: 3 archivos en test-results; no se abrieron ni publicaron.
- El screenshot/contexto de error se considera potencialmente sensible por corresponder al formulario; no se incluyó en este informe.
- Secretos mostrados: no.
- Tests funcionales: 0.
- Acciones de negocio: 0.

## 14. Cierre

- Procesos Playwright/Chromium del setup: cerrados.
- Puerto 3000: libre.
- Se observó un next-server externo propiedad de root, sin listener en 3000; no fue detenido por no pertenecer de forma verificable a esta ejecución.
- Staging/commit: no realizados.

## 15. Conclusión

- Generación completa: no.
- Causa local identificada: sí; selector ambiguo del botón de login.
- Corrección local preparada: selector exacto Entrar.
- Logins ejecutados: 1 intento autorizado, detenido en el primer setup.
- StorageState generados: 0.
- Baseline íntegro: sí.
- Requiere nueva autorización para reintentar: sí.
- FASE 5.2B: bloqueada hasta un nuevo intento autorizado.

## Intento 2 — 2026-08-07

- Autorización: una ejecución global con `--role=all`.
- Baseline preflight: PASS.
- Guard: PASS.
- Selector exacto confirmado: sí.
- Chromium: disponible; instalación no ejecutada.
- Puerto inicial: libre.
- Admin: PASS, un login, redirección y rol validados; `admin.json` generado.
- Lab staff: NO_EJECUTADO.
- Teacher: NO_EJECUTADO.
- Student: NO_EJECUTADO.
- Causa de detención: el launcher construyó `auth-lab_staff`, pero el proyecto configurado es `auth-lab-staff`.
- StorageState generados: 1.
- Tests funcionales: 0. Acciones de negocio: 0. RPC de negocio: 0. Escrituras `public`: 0.
- Baseline posterior: PASS.
- Corrección local preparada: tabla explícita de mapeo role -> setup project; no se reintentó.
- Artefactos: no se abrieron ni publicaron; los del intento anterior siguen potencialmente sensibles.
- Procesos de esta ejecución: cerrados; puerto 3000 libre.
- FASE 5.2B: incompleta; requiere nueva autorización para continuar.
\n## Intento 3 - 2026-08-07\n\n- Guard con estado parcial: PASS.\n- Admin existente: conservado; hash sin cambios.\n- lab_staff: login PASS, pero el setup generó lab_staff.json en lugar del destino autorizado lab-staff.json.\n- Teacher: NO_EJECUTADO.\n- Student: NO_EJECUTADO.\n- Logins nuevos: 1.\n- StorageState físicos: 2; destinos autorizados válidos: 1.\n- Causa: el nombre de archivo se derivaba de config.role y no de un mapeo explícito.\n- Corrección local preparada: cada rol tiene ahora un nombre de archivo explícito; no se renombró ni copió el estado existente.\n- Validador de los cuatro estados: NO_EJECUTADO.\n- Baseline posterior: PASS.\n- Tests funcionales/acciones/RPC/escrituras public: 0.\n- Próximo paso: requiere nueva autorización; no ejecutar automáticamente.\n
## Intento 4 - 2026-08-07

- Rename atómico: PASS; lab_staff.json -> lab-staff.json.
- Contenido lab_staff: unchanged; hash conservado.
- Admin: unchanged; hash conservado.
- ROLE_PROJECT_FILE_MAPPING: PASS.
- Baseline preflight: PASS. Guard: PASS.
- Teacher: FAIL en validación de rol visible después de llegar a /solicitudes; no se guardó teacher.json.
- Student: NO_EJECUTADO por detención ante el primer fallo.
- Nuevos logins: 1.
- StorageState finales: 2; nombres físicos correctos presentes: admin.json y lab-staff.json.
- Residual lab_staff.json: no.
- Validador completo: NO_EJECUTADO porque faltan teacher y student.
- Tests funcionales/acciones/RPC/escrituras public: 0.
- Baseline posterior: PASS.
- Artifacts: 3 metadatos; no abiertos ni publicados; 2 potencialmente sensibles por captura/contexto de formulario.
- Next/Chromium de esta ejecución: cerrados; puerto 3000 libre.
- FASE 5.2B: incompleta; no iniciar FASE 5.3.

## Diagnóstico actual de teacher - 2026-08-07

- Causa UI identificada: sí.
- /solicitudes renderiza el texto exacto Docente/Estudiante en el badge de perfil; no renderiza Rol: Docente.
- Teacher llegó a /solicitudes, por lo que el login y la navegación pasaron; falló únicamente la aserción de rol.
- Validación corregida localmente con roleText explícito por ruta.
- Student revisado preventivamente y configurado con texto exacto Estudiante.
- No se repitió teacher y no se ejecutó student por el límite de la autorización.
- Baseline posterior: PASS; escrituras public/RPC/acciones de negocio: 0.
- FASE 5.2B: incompleta; requiere nueva autorización para teacher y student.

## Intento actual - 2026-08-07

- TEACHER_UI_ASSERTION: PASS; STUDENT_UI_ASSERTION: PASS.
- Baseline preflight: PASS. Guard: PASS.
- Teacher: login PASS, ruta /solicitudes PASS, role/profile PASS, teacher.json generado.
- Student: login PASS, ruta /solicitudes PASS, role/profile PASS, student.json generado.
- Nuevos logins: 2; admin/lab_staff no se reautenticaron.
- StorageState finales: 4, con nombres físicos correctos y permisos 600; carpeta 700.
- Validador completo: STORAGE_STATES: PASS.
- Admin y lab_staff: hashes sin cambios.
- Baseline posterior: PASS.
- Tests funcionales/acciones/RPC/escrituras public: 0.
- Artifacts actuales: 1 metadato; no abierto ni publicado.
- Next/Chromium: detenidos; puerto 3000 libre.
- FASE 5.2B: completada.
- FASE 5.3: lista, sin iniciarla.
