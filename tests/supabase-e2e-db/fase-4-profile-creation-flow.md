# FASE 4 — Creación de perfiles

## Contraseña
1. Crear usuario confirmado por Admin API.
2. Crear profile con el mismo UUID y rol aprobado.
3. Iniciar sesión y verificar getAuthProfile.

## Google OAuth
1. OAuth solicita dominio ucuenca.edu.ec.
2. Callback intercambia código y valida correo.
3. Si profile existe, conserva su rol.
4. Si no existe, inserta profile student.

No confiar en handle_new_user: existe como función, pero no tiene trigger Auth. ensure_google_institutional_profile tampoco tiene llamada activa encontrada.
