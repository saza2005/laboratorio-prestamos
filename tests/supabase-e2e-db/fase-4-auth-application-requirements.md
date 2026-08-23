# FASE 4 — Requisitos Auth

- Contraseña: signInWithPassword en app/auth/login/actions.ts.
- Google OAuth: signInWithOAuth y callback en app/auth/oauth-actions.ts y app/auth/callback/route.ts.
- Callback: exchangeCodeForSession, valida @ucuenca.edu.ec y consulta profiles.
- Login por contraseña exige usuario confirmado y perfil existente.
- OAuth crea manualmente un perfil student si no existe.
- Existe ensure_google_institutional_profile(), pero no se encontró llamada activa.
- Existe handle_new_user(), pero no existe trigger sobre auth.users; los cinco triggers son set_updated_at.
- No se encontró middleware.ts en la raíz del worktree.
- admin y lab_staff van a /dashboard; teacher y student van a /solicitudes.
- teacher puede crear solicitudes grupales; student no.

Conclusión: crear usuarios confirmados mediante Admin API y perfiles en una etapa separada. OAuth real queda opcional/manual.
