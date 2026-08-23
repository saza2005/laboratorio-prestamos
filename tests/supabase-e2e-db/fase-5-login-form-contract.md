# FASE 5.1C — Contrato del formulario de login

- Ruta: /auth/login.
- Form action: Server Action loginUser.
- Email: input type=email, name=email, required, autocomplete=email.
- Password: input type=password, name=password, required, autocomplete=current-password.
- Orden de argumentos: FormData email y password, sin intercambio.
- Email: se normaliza con trim.
- Password: se conserva exactamente; no se transforma ni se recorta.
- OAuth: no se usa en este formulario.
- Mensajes: se muestran según el parámetro error de la URL.
- Loading: SubmitButton usa useFormStatus.
- Evidencia: app/auth/login/login-form.tsx y app/auth/login/actions.ts.
