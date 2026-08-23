# FASE 5 — Entorno y arranque local de la aplicación E2E

## 1. Entorno

- Proyecto: Supabase E2E.
- Project Ref parcialmente oculto: rwni********wwim.
- Rama: chore/e2e-supabase-baseline.
- Baseline preflight: PASS, código 0.
- Dependencias modificadas: no.

## 2. Contrato de variables

- Variables requeridas: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.
- Variables públicas: las dos variables NEXT_PUBLIC de Supabase.
- Variables servidor: ninguna necesaria para arrancar las rutas verificadas.
- Service role requerida por app: no.
- Contraseñas requeridas por app: no.
- Variables omitidas: service role, E2E emails/passwords, confirmaciones, Project Ref esperado, tokens, sesiones y correo Resend.
- Incertidumbres: las funciones de correo tienen variables opcionales no necesarias para este smoke test.

## 3. Archivo app E2E

- Ruta: .env.app-e2e.
- Creado: sí.
- Ignorado: sí, por la regla .env*.
- Permisos: 600.
- Variables incluidas: únicamente las dos NEXT_PUBLIC de Supabase.
- Service role: no.
- Contraseñas: no.
- Correos: no.
- Tokens: no.
- Sesiones: no.

## 4. Auditoría de secretos

- Cliente navegador: usa únicamente variables NEXT_PUBLIC.
- Código servidor: usa el mismo cliente SSR público; no hay cliente service role en la app.
- use client: sin imports administrativos.
- Service role expuesta: no.
- Credenciales hardcodeadas: 0.
- State importado: no.
- Resultado: PASS.

## 5. Guard y lanzador

- Guard: scripts/e2e/verify-app-environment.mjs.
- Lanzador: scripts/e2e/start-app-e2e.mjs.
- Project Ref validado: sí.
- Puerto: 3000, validado libre antes del arranque.
- Argumentos: confirmación obligatoria y argumentos desconocidos rechazados.
- Señales: SIGINT y SIGTERM propagadas al proceso Next.
- Service role en proceso Next: no.
- Contraseñas en proceso Next: no.
- Auditoría estática: PASS.

## 6. Arranque

- Puerto libre: sí.
- Aplicación iniciada: sí.
- Código de inicio: proceso Ready; el lanzador terminó correctamente al recibir SIGINT.
- URL local: http://localhost:3000.
- Target Supabase: E2E.
- Project Ref match: PASS.
- Errores de variables: 0.
- Errores 500: 0.

## 7. Smoke HTTP

- Rutas verificadas: /, /auth/login, /auth/callback sin code y /dashboard.
- Códigos: raíz 200; login 200; callback 307 hacia login; dashboard 200 con estado de error no autenticado.
- Redirecciones: callback sin code redirigió a login; no se forzó una redirección de dashboard que la app no emitió.
- Recursos: cargados sin error 500.
- Secretos en HTML: 0.
- Correos E2E en HTML: 0.
- UUID E2E en HTML: 0.
- Formularios enviados: no.
- Login ejecutado: no.

## 8. Cierre

- Proceso detenido: sí.
- Puerto liberado: sí.
- Procesos huérfanos: no observados.
- Sesiones creadas: no.
- Cookies creadas: no se utilizó navegador.

## 9. Integridad posterior

- Baseline posterior: PASS.
- Código: 0.
- Hashes state: sin cambios.
- Datos remotos: sin cambios.
- RPC: 0.
- Escrituras: 0.
- Proyecto normal: no consultado ni modificado.

## 10. Conclusión

- Entorno app E2E válido: sí.
- Aplicación conecta a E2E: sí.
- Secretos aislados: sí.
- Arranque reproducible: sí.
- Listo para validar logins: sí.
- Playwright ejecutado: no.
- Problemas pendientes: ninguno bloqueante; dashboard sin autenticación muestra su estado de error propio con HTTP 200.
- Siguiente paso: FASE 5.1B, logins manuales controlados.
