# FASE 5.1C — Matriz de etapas del login

| stage | source_file | input | success_condition | possible_error | current_user_message | correct_user_message | sensitive_data_risk | evidence |
|---|---|---|---|---|---|---|---|---|
| FORM_PARSE | app/auth/login/actions.ts | FormData email/password | valores no vacíos | missing_credentials | mensaje de campos faltantes | mensaje de campos faltantes | bajo | lectura explícita por name |
| SUPABASE_SIGN_IN | app/auth/login/actions.ts | email/password | data.user | invalid credentials, rate limit, network | categorías diferenciadas | mensaje Auth correspondiente | no registrar valores | signInWithPassword |
| COOKIE_WRITE | lib/supabase/server.ts, actions.ts | cookies SSR | cliente creado y cookies operables | cookie failure | no fue diferenciada antes | no fue posible preparar sesión | no registrar cookies | getAll/setAll y limpieza |
| AUTH_USER_READ | actions.ts | data.user | user existente y confirmado | no user, unconfirmed | mensajes separados | cuenta no confirmada o error Auth | no registrar user | validación email_confirmed_at |
| PROFILE_READ | actions.ts | user.id | profile disponible | profile missing/denied | antes se presentaba no_profile | perfil no cargable | no registrar UUID | maybeSingle y clasificación |
| ACTIVE_VALIDATION | actions.ts | profile.is_active | true | inactive | antes no se validaba | cuenta inactiva | no registrar profile | validación explícita |
| ROLE_VALIDATION | actions.ts, roles.ts | profile.role | home route válida | invalid role | antes podía caer a login | rol inválido | no registrar UUID | getHomeRouteByRole |
| REDIRECT | actions.ts | home route | redirección por rol | redirect failure | excepción no capturada | no fue posible completar login | no registrar URL sensible | redirect fuera de catch |

La causa final requiere una única prueba manual de admin con los logs sanitizados por etapa.
