-- Apagar a própria conta (LGPD e exigência da loja). Só apaga o usuário logado (auth.uid());
-- perfil, conexões dos dois lados, eventos criados e presenças caem em cascata.
-- A foto do perfil é apagada pelo app via Storage API antes de chamar esta função.
create index if not exists events_created_by_idx on public.events (created_by);

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  delete from auth.users where id = v_me;
end $$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
