-- Connex v4c: remove a data de nascimento única (20261108000005), substituída por
-- birth_day/birth_month/birth_year (20261108000006). Coluna sem dados nem uso no app.
-- Autorizado pelo dono do projeto em 07/11/2026.

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
  end if;
  return next v_row;
end $$;

drop function public.shared_birthday(public.connections);
alter table public.profiles drop column birthday;
