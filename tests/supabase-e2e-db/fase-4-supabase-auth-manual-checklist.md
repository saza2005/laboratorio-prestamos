# FASE 4 — Checklist Auth manual

Solo en el Dashboard E2E: Site URL; Redirect URLs; Email provider; Confirm email; Google provider; dominio institucional; CAPTCHA; rate limits; plantillas.

Contraseña: provider activo y usuarios confirmados para pruebas.
OAuth: credenciales y callback propios del E2E; revisar hd institucional.
Playwright: sesiones aisladas, correos exclusivos, sin secretos en logs.

No copiar ciegamente configuración del proyecto normal. No usar SQL directo sobre auth.users ni Google OAuth real como automatización principal.
