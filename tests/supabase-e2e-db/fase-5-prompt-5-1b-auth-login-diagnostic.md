# FASE 5.1B — Diagnóstico de login Auth E2E

## 1. Variables y proyecto

- Variables requeridas presentes: sí, 11/11.
- Valores no vacíos: sí.
- Correos distintos: sí, 4.
- Contraseñas distintas: sí, 4.
- Espacios accidentales: no detectados.
- Project Ref correcto: sí.
- Variables de otro proyecto: no detectadas.

## 2. Auth y profiles

- Usuarios Auth encontrados: 4.
- Usuarios confirmados: 4.
- Usuarios bloqueados: 0.
- Profiles activos: 4.
- UUID Auth/profile/state coinciden: sí.
- Metadata E2E y alias: correctos.
- Sesiones persistidas: no.

## 3. Logins directos

| alias | usuario encontrado | correo confirmado | login | categoría | usuario coincide | logout |
|---|---|---|---|---|---|---|
| e2e_admin | sí | sí | PASS | none | sí | PASS |
| e2e_lab_staff | sí | sí | PASS | none | sí | PASS |
| e2e_teacher | sí | sí | PASS | none | sí | PASS |
| e2e_student | sí | sí | PASS | none | sí | PASS |

No se registraron correos, UUID, tokens ni sesiones.

## 4. Interpretación

- Las variables de entorno autentican directamente contra Supabase E2E.
- Los cuatro usuarios están habilitados y sus profiles activos.
- El error observado en la ruta de login queda localizado en la aplicación: formulario, Server Action, carga del entorno o cliente SSR.
- Restablecimiento de contraseña requerido: no.
- No se modificaron usuarios ni contraseñas.

## 5. Integridad posterior

- Baseline posterior: PASS.
- Código: 0.
- Datos public modificados: no.
- RPC de negocio: 0.
- Escrituras remotas: 0.
- Profiles o roles modificados: no.
- Tokens mostrados: no.
- StorageState generado: no.
- Playwright ejecutado: no.

## 6. Artefactos

- Diagnóstico sanitizado: tests/supabase-e2e-db/fase-5-auth-login-diagnostic.txt
- Verificador: scripts/e2e/verify-auth-logins.mjs
- Baseline posterior: tests/supabase-e2e-db/fase-5-1b-baseline-post-login.txt

La FASE 5.1B queda pausada. No se continúan los ciclos manuales hasta corregir e inspeccionar el flujo de login de la aplicación.
