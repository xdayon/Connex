-- Connex v4: data de nascimento.
--   * O dono lê a data completa (my_profile devolve a linha inteira).
--   * Quem salvou a pessoa vê só dia e mês (MM-DD), nunca o ano, pela coluna calculada
--     connections.shared_birthday. Não aparece na página pública nem na lista do evento.

alter table public.profiles
  add column birthday date check (birthday between date '1900-01-01' and date '2100-01-01');

-- Sem grant de SELECT na coluna: o SELECT direto em profiles continua limitado às colunas
-- liberadas em 20261107000004. Só o dono altera.
grant update (birthday) on public.profiles to authenticated;

create function public.shared_birthday(c public.connections) returns text
language sql stable security definer set search_path = '' as $$
  select to_char(p.birthday, 'MM-DD')
  from public.connections as x
  join public.profiles as p on p.id = x.contact_id
  where x.id = c.id
    and x.owner_id = (select auth.uid());
$$;

revoke execute on function public.shared_birthday(public.connections) from public, anon;
grant execute on function public.shared_birthday(public.connections) to authenticated;

-- get_profile devolve a linha de profiles: para quem não é o dono, a data sai vazia.
create or replace function public.get_profile(p_handle text) returns setof public.profiles
language plpgsql stable security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_row public.profiles;
  v_keys text[];
begin
  select * into v_row
  from public.profiles as p
  where p.handle = lower(p_handle)
    and (p.is_public or (v_me is not null and private.can_see_profile(p.id)))
  limit 1;
  if not found then
    return;
  end if;

  if v_row.id is distinct from v_me then
    v_keys := private.default_share(v_row.id)
      || coalesce((select shared_keys from public.connections where owner_id = v_me and contact_id = v_row.id), '{}');
    v_row.links := coalesce((
      select jsonb_object_agg(e.key, e.value) from jsonb_each(v_row.links) as e where e.key = any (v_keys)
    ), '{}'::jsonb);
    if not ('wallet' = any (v_keys)) then
      v_row.wallet := null;
    end if;
    v_row.share_hidden := '{}';
    v_row.birthday := null;
  end if;
  return next v_row;
end $$;
