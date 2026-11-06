-- Connex v2: mais redes nos links, eventos "listados" (curados pelo servidor), check-in
-- e modelo de desbloqueio (ver pessoas num evento não revela o perfil completo).

-- ---------------------------------------------------------------------------
-- Links: novas chaves; só https, exceto discord que também aceita nome de usuário puro
-- ---------------------------------------------------------------------------
create or replace function private.valid_links(p jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(p) = 'object'
    and (select count(*) from jsonb_object_keys(p)) <= 14
    and not exists (
      select 1
      from jsonb_each(p) as e
      where e.key not in ('telegram', 'x', 'website', 'github', 'farcaster', 'linkedin', 'discord',
                          'superteam', 'calendar', 'instagram', 'youtube', 'tiktok')
         or jsonb_typeof(e.value) <> 'string'
         or char_length(e.value #>> '{}') > 300
         or not (
              (e.value #>> '{}') ~ '^https://[^[:space:]<>"''`]+$'
              or (e.key = 'discord' and (e.value #>> '{}') ~ '^[a-z0-9_.]{2,32}$')
            )
    );
$$;

-- ---------------------------------------------------------------------------
-- Eventos listados: flag curada, só o service role altera (sem grant de update)
-- ---------------------------------------------------------------------------
alter table public.events add column listed boolean not null default false;

drop policy events_select on public.events;
create policy events_select on public.events
  for select to authenticated
  using (listed or created_by = (select auth.uid()) or private.is_attendee(id));

create function public.check_in(p_event uuid) returns public.events
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_row public.events;
begin
  if v_me is null or not exists (select 1 from public.profiles where id = v_me) then
    raise exception 'profile required' using errcode = '28000';
  end if;

  select * into v_row from public.events where id = p_event and listed;
  if not found then
    raise exception 'event not found' using errcode = 'P0002';
  end if;

  insert into public.event_attendees (event_id, user_id) values (v_row.id, v_me)
  on conflict do nothing;
  return v_row;
end $$;

revoke execute on function public.check_in(uuid) from public, anon;
grant execute on function public.check_in(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Desbloqueio: co-participantes deixam de enxergar o perfil completo um do outro.
-- Só o próprio perfil ou uma conexão (em qualquer direção) libera a linha em profiles.
-- ---------------------------------------------------------------------------
create or replace function private.can_see_profile(p_profile uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_profile = (select auth.uid())
    or exists (
      select 1 from public.connections
      where (owner_id = (select auth.uid()) and contact_id = p_profile)
         or (owner_id = p_profile and contact_id = (select auth.uid()))
    );
$$;

-- Lista limitada de quem está no evento: nunca carteira, bio, links ou localização.
create function public.event_people(p_event uuid)
returns table (
  user_id uuid,
  handle text,
  display_name text,
  avatar_url text,
  headline text,
  company text,
  skills text[],
  looking_for text[],
  offering text[],
  is_public boolean,
  seeker_verified boolean,
  is_me boolean,
  in_network boolean,
  verified boolean,
  joined_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null or not exists (
    select 1 from public.event_attendees as a where a.event_id = p_event and a.user_id = v_me
  ) then
    raise exception 'event not found' using errcode = 'P0002';
  end if;

  return query
  select p.id, p.handle, p.display_name, p.avatar_url, p.headline, p.company,
         p.skills, p.looking_for, p.offering, p.is_public, p.seeker_verified,
         p.id = v_me,
         c.id is not null,
         coalesce(c.verified, false),
         a.joined_at
  from public.event_attendees as a
  join public.profiles as p on p.id = a.user_id
  left join public.connections as c on c.owner_id = v_me and c.contact_id = p.id
  where a.event_id = p_event
    and p.handle is not null
    and (a.visible or a.user_id = v_me)
  order by a.joined_at desc;
end $$;

revoke execute on function public.event_people(uuid) from public, anon;
grant execute on function public.event_people(uuid) to authenticated;
