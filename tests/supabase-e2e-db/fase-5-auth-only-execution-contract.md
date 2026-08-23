# Contrato de ejecución futura AUTH_ONLY

- Baseline requerido: PASS.
- StorageState canónicos: 4/4 PASS antes y después.
- Escrituras public esperadas: 0.
- No usar ni sobrescribir los cuatro estados canónicos.
- Runner futuro separado y filtrado; credenciales solo para el test autorizado.

| Test | Bloque | Autorizado | Sesión | Login nuevo | Logout | Efecto Auth | Estado canónico |
|---|---|---|---|---:|---:|---|---|
| ROLE-01 | LS | No en esta fase | Efímera | 1 | 0 | last_sign_in_at posible | No tocar |
| ROLE-02 | LS | No en esta fase | Efímera | 1 | 0 | last_sign_in_at posible | No tocar |
| SETUP-01 | SP | No en esta fase | Vacía por rol | 4 | 0 | last_sign_in_at posible | No escribir canónicos |
| Logout futuro | LO | No en esta fase | Efímera | 0 o login efímero | 1 | scope local | No tocar |

Cada bloque requiere autorización independiente. El logout debe usar sesión efímera.
