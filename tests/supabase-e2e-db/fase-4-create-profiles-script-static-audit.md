# Auditoria estatica del script de perfiles E2E

- Insert alcanzable en dry-run: no; el insert esta detras de la bifurcacion execute y confirmacion adicional
- Update alcanzable: no
- Delete alcanzable: no
- Upsert utilizado: no
- RPC utilizada: no
- Auth createUser: no
- Auth updateUser: no
- Auth deleteUser: no
- Secretos hardcodeados: 0
- Correos reales hardcodeados: 0
- UUID hardcodeados: 0
- Roles derivados del mapeo controlado: si
- Consultas limitadas a cuatro UUID: si; profiles usa .in(id, ids)
- Sintaxis Node: correcta
- Archivo profiles.json creado durante dry-run: no
