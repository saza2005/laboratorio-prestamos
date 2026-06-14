-- Impide que clientes llamen RPC antiguas que ya no usa la aplicación.
-- Las funciones se conservan para facilitar una eventual auditoría o reversión.

do $$
begin
  if to_regprocedure(
    'public.create_loan_transaction(uuid,uuid,integer,date,text,uuid)'
  ) is not null then
    execute '
      revoke all on function public.create_loan_transaction(
        uuid, uuid, integer, date, text, uuid
      ) from public, anon, authenticated
    ';
  end if;

  if to_regprocedure(
    'public.create_loan_with_unit_transaction(uuid,uuid,uuid,integer,date,text,uuid)'
  ) is not null then
    execute '
      revoke all on function public.create_loan_with_unit_transaction(
        uuid, uuid, uuid, integer, date, text, uuid
      ) from public, anon, authenticated
    ';
  end if;

  if to_regprocedure(
    'public.deliver_approved_request(uuid,uuid,text)'
  ) is not null then
    execute '
      revoke all on function public.deliver_approved_request(
        uuid, uuid, text
      ) from public, anon, authenticated
    ';
  end if;
end;
$$;

notify pgrst, 'reload schema';
