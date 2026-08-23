# FASE 5 — Contrato del entorno de aplicación E2E

| variable | used_by | client_or_server | required_for_local_app | safe_for_browser | source_file | included_in_app_e2e | reason | notes |
|---|---|---|---|---|---|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | clientes Supabase | browser/server | sí | sí | lib/supabase/client.ts, lib/supabase/server.ts | sí | URL del proyecto E2E | Ref validado por el guard |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | clientes Supabase | browser/server | sí | sí | lib/supabase/client.ts, lib/supabase/server.ts | sí | autenticación pública con RLS | No es service role |
| SUPABASE_SERVICE_ROLE_KEY | scripts administrativos | servidor de scripts, no app | no | no | scripts/e2e/* | no | no es necesaria para Next.js | Excluida |
| E2E_*_EMAIL | scripts E2E | scripts, no app | no | no | scripts/e2e/* | no | credenciales de pruebas posteriores | Excluidas |
| E2E_*_PASSWORD | scripts E2E | scripts, no app | no | no | scripts/e2e/* | no | credenciales de pruebas posteriores | Excluidas |
| E2E_EXPECTED_PROJECT_REF | guard/lanzador | proceso de preparación | no | no | scripts/e2e/* | no | comparación temporal del destino | No se incluye en el archivo app |
| NEXT_PUBLIC_APP_URL | utilidad de correo | servidor | no para smoke público | sí si se usa | lib/email/resend.ts | no | tiene fallback localhost:3000 | No necesaria para arrancar |
| RESEND_API_KEY | correo | servidor | no para smoke público | no | lib/email/resend.ts | no | solo acciones de correo | Excluida |
| EMAIL_FROM | correo | servidor | no para smoke público | no | lib/email/resend.ts | no | solo acciones de correo | Excluida |

Conclusión: el entorno mínimo contiene únicamente las dos variables NEXT_PUBLIC de Supabase E2E.
