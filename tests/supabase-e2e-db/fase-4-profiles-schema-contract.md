# Contrato de public.profiles para E2E

Fuente primaria: supabase/migrations/20260805220647_baseline_public_schema.sql.

| column | type | nullable | default | constraint | source_for_e2e | required_in_insert | notes |
|---|---|---|---|---|---|---|---|
| id | uuid | no | none | PK; FK auth.users(id) ON DELETE CASCADE | auth-users.json | yes | Must equal Auth user UUID. |
| full_name | text | no | none | NOT NULL | controlled E2E label | yes | Uses E2E Admin, E2E Laboratory Staff, E2E Teacher, E2E Student. |
| email | text | no | none | UNIQUE; NOT NULL | Auth user email | yes | Must match the corresponding Auth user. |
| role | public.user_role | no | student | enum; NOT NULL | controlled alias-to-role mapping | yes | Explicitly supplied to avoid the default. |
| career | text | yes | null | none | none | no | Omitted. |
| is_active | boolean | no | true | NOT NULL | default | no | Omitted; database default applies. |
| created_at | timestamptz | no | now() | NOT NULL | default | no | Omitted; database default applies. |
| updated_at | timestamptz | no | now() | NOT NULL | default | no | Omitted; database default applies. |

## Constraints and authorization

- Primary key: profiles_pkey on id.
- Foreign key: profiles_id_fkey references auth.users(id) with ON DELETE CASCADE.
- Unique constraint: profiles_email_key on email.
- Role enum: public.user_role.
- Exact enum values and order: admin, lab_staff, teacher, student.
- RLS: enabled on profiles.
- Relevant policies: authenticated profile owner insert/select; staff select/update; teachers may select student profiles.
- There is no active trigger on auth.users creating profiles. The application OAuth callback inserts a student profile manually; this E2E script uses the administrative client for the controlled setup.
- Application consumers read id, full_name, email and role; role controls redirects and authorization.
