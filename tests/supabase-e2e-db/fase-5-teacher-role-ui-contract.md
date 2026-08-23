# Teacher/Student Role UI Contract

- Teacher route: /solicitudes.
- Teacher visible role text: Docente.
- Student route: /solicitudes.
- Student visible role text: Estudiante.
- Evidence: app/solicitudes/page.tsx renders formatUserRole(profile.role) inside the profile badge.
- Dashboard role text differs: Rol: Administrador or Rol: Laboratorista.
- Recommended assertion: exact visible role text configured per route, without CSS selectors or nth().
- Previous failure: the setup searched for Rol: Docente, which is not rendered by /solicitudes.
