-- Connex v3: compartilhamento seletivo.
--   * Novas redes nos links (WhatsApp, Steam, Twitch, Reddit, Bluesky).
--   * Cada pessoa tem um padrão do que compartilha (profiles.share_hidden = o que fica oculto).
--   * Cada conexão guarda o que o contato liberou para o dono (connections.shared_keys).
--   * links e carteira saem do SELECT direto em profiles: só o próprio dono lê os seus;
--     um contato lê apenas o que foi liberado, pelas colunas calculadas shared_links/shared_wallet.

-- ---------------------------------------------------------------------------
-- Links: novas chaves; WhatsApp vira https://wa.me/<número>
-- ---------------------------------------------------------------------------
create or replace function private.link_keys() returns text[]
language sql immutable set search_path = '' as $$
  select array['whatsapp', 'telegram', 'x', 'instagram', 'linkedin', 'github', 'farcaster', 'discord',
               'superteam', 'website', 'calendar', 'youtube', 'tiktok', 'twitch', 'steam', 'reddit', 'bluesky'];
$$;

-- O que pode ser compartilhado: as redes e a carteira.
create or replace function private.share_keys() returns text[]
language sql immutable set search_path = '' as $$
  select private.link_keys() || array['wallet'];
$$;

create or replace function private.valid_share(p text[]) returns boolean
language sql immutable set search_path = '' as $$
  select p is not null and cardinality(p) <= 32 and p <@ private.share_keys();
$$;

create or replace function private.valid_links(p jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(p) = 'object'
    and (select count(*) from jsonb_object_keys(p)) <= 20
    and not exists (
      select 1
      from jsonb_each(p) as e
      where not (e.key = any (private.link_keys()))
         or jsonb_typeof(e.value) <> 'string'
         or char_length(e.value #>> '{}') > 300
         or not (
              (e.value #>> '{}') ~ '^https://[^[:space:]<>"''`]+$'
              or (e.key = 'discord' and (e.value #>> '{}') ~ '^[a-z0-9_.]{2,32}$')
            )
    );
$$;

grant execute on function private.link_keys() to anon, authenticated;
grant execute on function private.share_keys() to anon, authenticated;
grant execute on function private.valid_share(text[]) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Padrão de compartilhamento: guarda o que fica OCULTO, assim uma rede nova entra
-- no padrão sozinha. WhatsApp (telefone) começa oculto.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column share_hidden text[] not null default '{whatsapp}' check (private.valid_share(share_hidden));

create function private.default_share(p_user uuid) returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array(
    select k from unnest(private.share_keys()) as k
    where not (k = any (coalesce((select share_hidden from public.profiles where id = p_user), '{}')))
  ), '{}');
$$;

-- O que cada conexão pode ver do contato. As conexões que já existem continuam vendo tudo.
alter table public.connections add column shared_keys text[];
update public.connections set shared_keys = private.share_keys();
alter table public.connections
  alter column shared_keys set not null,
  alter column shared_keys set default '{}',
  add constraint connections_shared_keys_valid check (private.valid_share(shared_keys));

-- Seleção escolhida por quem está mostrando o QR ao vivo (última, vale por alguns minutos).
create table private.share_offers (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  keys text[] not null check (private.valid_share(keys)),
  updated_at timestamptz not null default now()
);
revoke all on private.share_offers from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Privilégios de coluna: links, carteira e padrão saem do SELECT direto
-- ---------------------------------------------------------------------------
revoke select on public.profiles from authenticated;
grant select (id, handle, display_name, headline, bio, avatar_url, company, location, skills, looking_for,
              offering, is_public, skr_name, seeker_verified, created_at, updated_at)
  on public.profiles to authenticated;
grant update (share_hidden) on public.profiles to authenticated;

-- Perfil completo do próprio usuário (inclui links, carteira e padrão).
create function public.my_profile() returns setof public.profiles
language sql stable security definer set search_path = '' as $$
  select * from public.profiles where id = (select auth.uid());
$$;
revoke execute on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;

-- ---------------------------------------------------------------------------
-- Colunas calculadas em connections (PostgREST: select=*,shared_links,shared_wallet).
-- Sempre relê a linha real pelo id: nunca confia nos campos recebidos, que podem
-- ser forjados se alguém chamar a função direto por /rpc.
-- ---------------------------------------------------------------------------
create function public.shared_links(c public.connections) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
  from public.connections as x
  join public.profiles as p on p.id = x.contact_id
  cross join lateral jsonb_each(p.links) as e
  where x.id = c.id
    and x.owner_id = (select auth.uid())
    and e.key = any (x.shared_keys);
$$;

create function public.shared_wallet(c public.connections) returns text
language sql stable security definer set search_path = '' as $$
  select p.wallet
  from public.connections as x
  join public.profiles as p on p.id = x.contact_id
  where x.id = c.id
    and x.owner_id = (select auth.uid())
    and 'wallet' = any (x.shared_keys);
$$;

revoke execute on function public.shared_links(public.connections) from public, anon;
revoke execute on function public.shared_wallet(public.connections) from public, anon;
grant execute on function public.shared_links(public.connections) to authenticated;
grant execute on function public.shared_wallet(public.connections) to authenticated;

-- ---------------------------------------------------------------------------
-- Página pública /u/:handle: o dono vê tudo; os outros veem o padrão dele
-- (mais o que ele liberou numa conexão com quem está vendo).
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- QR ao vivo: quem mostra o QR pode mandar a seleção do momento (null = padrão)
-- ---------------------------------------------------------------------------
drop function public.live_qr_token();
create function public.live_qr_token(p_share text[] default null) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_window bigint := floor(extract(epoch from now()) / 30);
  v_key bytea;
begin
  if v_uid is null or not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'profile required' using errcode = '28000';
  end if;
  if p_share is null then
    delete from private.share_offers where user_id = v_uid;
  else
    if not private.valid_share(p_share) then
      raise exception 'invalid share' using errcode = '22023';
    end if;
    insert into private.share_offers (user_id, keys) values (v_uid, p_share)
    on conflict (user_id) do update set keys = excluded.keys, updated_at = now();
  end if;
  select value into v_key from private.secrets where name = 'qr_hmac_key';
  return v_window::text || '.' || substr(encode(
    extensions.hmac(convert_to(v_uid::text || ':' || v_window::text, 'UTF8'), v_key, 'sha256'), 'hex'), 1, 20);
end $$;

revoke execute on function public.live_qr_token(text[]) from public, anon;
grant execute on function public.live_qr_token(text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Conectar. p_share = o que EU libero para o contato (null = meu padrão).
-- O contato libera a seleção do QR dele (QR ao vivo) ou o padrão dele (crachá/link).
-- Reconectar só soma o que já tinha sido liberado.
-- ---------------------------------------------------------------------------
drop function public.connect(text, text, uuid);
create function public.connect(p_handle text, p_token text default null, p_event_id uuid default null, p_share text[] default null)
returns public.connections
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_contact uuid;
  v_contact_public boolean;
  v_verified boolean := false;
  v_window bigint;
  v_now bigint := floor(extract(epoch from now()) / 30);
  v_key bytea;
  v_event uuid;
  v_their_share text[];
  v_my_share text[];
  v_row public.connections;
begin
  if v_me is null or not exists (select 1 from public.profiles where id = v_me) then
    raise exception 'profile required' using errcode = '28000';
  end if;
  if p_share is not null and not private.valid_share(p_share) then
    raise exception 'invalid share' using errcode = '22023';
  end if;

  select id, is_public into v_contact, v_contact_public
  from public.profiles where handle = lower(p_handle);
  if v_contact is null then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
  if v_contact = v_me then
    raise exception 'cannot connect to yourself' using errcode = '22023';
  end if;

  if p_token is not null then
    if p_token !~ '^[0-9]{1,12}\.[0-9a-f]{20}$' then
      raise exception 'invalid qr' using errcode = '22023';
    end if;
    v_window := split_part(p_token, '.', 1)::bigint;
    if v_window between v_now - 2 and v_now then
      select value into v_key from private.secrets where name = 'qr_hmac_key';
      v_verified := split_part(p_token, '.', 2) = substr(encode(
        extensions.hmac(convert_to(v_contact::text || ':' || v_window::text, 'UTF8'), v_key, 'sha256'), 'hex'), 1, 20);
    end if;
    if not v_verified then
      raise exception 'qr expired' using errcode = '22023';
    end if;
  elsif not v_contact_public then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  if v_verified then
    select keys into v_their_share from private.share_offers
    where user_id = v_contact and updated_at > now() - interval '5 minutes';
  end if;
  v_their_share := coalesce(v_their_share, private.default_share(v_contact));
  v_my_share := coalesce(p_share, private.default_share(v_me));

  -- Só anexa um evento do qual quem escaneou participa.
  if p_event_id is not null
     and exists (select 1 from public.event_attendees where event_id = p_event_id and user_id = v_me) then
    v_event := p_event_id;
  end if;

  insert into public.connections (owner_id, contact_id, event_id, verified, method, shared_keys)
  values (v_me, v_contact, v_event, v_verified, case when v_verified then 'live_qr' else 'badge' end, v_their_share)
  on conflict (owner_id, contact_id) do update
    set verified = public.connections.verified or excluded.verified,
        method = case when excluded.verified then 'live_qr' else public.connections.method end,
        event_id = coalesce(public.connections.event_id, excluded.event_id),
        shared_keys = array(select distinct unnest(public.connections.shared_keys || excluded.shared_keys))
  returning * into v_row;

  if v_verified then
    insert into public.connections (owner_id, contact_id, event_id, verified, method, shared_keys)
    values (
      v_contact, v_me,
      case when v_event is not null
             and exists (select 1 from public.event_attendees where event_id = v_event and user_id = v_contact)
           then v_event end,
      true, 'live_qr', v_my_share)
    on conflict (owner_id, contact_id) do update
      set verified = true, method = 'live_qr',
          shared_keys = array(select distinct unnest(public.connections.shared_keys || excluded.shared_keys));
  end if;

  return v_row;
end $$;

revoke execute on function public.connect(text, text, uuid, text[]) from public, anon;
grant execute on function public.connect(text, text, uuid, text[]) to authenticated;

-- PostgREST precisa recarregar o esquema depois de trocar assinaturas de funções.
notify pgrst, 'reload schema';
