-- Connex: esquema inicial (MVP)
--
-- Princípios de segurança:
--   * RLS ligado em todas as tabelas; nada é acessível sem uma policy explícita.
--   * Os privilégios padrão do Supabase (ALL para anon/authenticated) são revogados
--     e só o necessário é concedido, coluna por coluna nas atualizações.
--   * A carteira do perfil vem da identidade do login (assinatura) e nunca é editável.
--   * Criar conexões, eventos e entradas em eventos só via funções que validam tudo.
--   * Segredos e helpers ficam no schema "private", que não é exposto pela API.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Schema privado
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
alter default privileges in schema private revoke execute on functions from public;

create table private.secrets (
  name text primary key,
  value bytea not null
);
revoke all on private.secrets from public, anon, authenticated;

-- Chave do QR dinâmico (HMAC). Gerada no banco, nunca sai dele.
insert into private.secrets (name, value)
values ('qr_hmac_key', extensions.gen_random_bytes(32))
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Funções de validação (puras)
-- ---------------------------------------------------------------------------
create function private.is_solana_address(p text) returns boolean
language sql immutable set search_path = '' as $$
  select p ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$';
$$;

create function private.short_items(p text[], max_len int) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(bool_and(char_length(x) between 1 and max_len), true) from unnest(p) as x;
$$;

-- Links só https e só nas chaves conhecidas: evita "javascript:" e afins no perfil.
create function private.valid_links(p jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(p) = 'object'
    and (select count(*) from jsonb_object_keys(p)) <= 12
    and not exists (
      select 1
      from jsonb_each(p) as e
      where e.key not in ('x', 'github', 'linkedin', 'instagram', 'telegram', 'farcaster', 'youtube', 'tiktok', 'website')
         or jsonb_typeof(e.value) <> 'string'
         or char_length(e.value #>> '{}') > 300
         or not ((e.value #>> '{}') ~ '^https://[^[:space:]<>"''`]+$')
    );
$$;

create function private.new_join_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 32 símbolos, sem I/O/0/1
  b bytea := extensions.gen_random_bytes(6);
  code text := '';
begin
  for i in 0..5 loop
    code := code || substr(alphabet, (get_byte(b, i) % 32) + 1, 1);
  end loop;
  return code;
end $$;

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

grant execute on function private.is_solana_address(text) to anon, authenticated;
grant execute on function private.short_items(text[], int) to anon, authenticated;
grant execute on function private.valid_links(jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Perfis
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  wallet text not null unique check (private.is_solana_address(wallet)),
  handle text unique check (handle ~ '^[a-z0-9_]{3,20}$'),
  display_name text check (char_length(display_name) <= 60),
  headline text check (char_length(headline) <= 120),
  bio text check (char_length(bio) <= 500),
  avatar_url text check (char_length(avatar_url) <= 500 and avatar_url ~ '^https://[^[:space:]<>"''`]+$'),
  company text check (char_length(company) <= 80),
  location text check (char_length(location) <= 80),
  links jsonb not null default '{}'::jsonb check (private.valid_links(links)),
  skills text[] not null default '{}' check (cardinality(skills) <= 30 and private.short_items(skills, 40)),
  looking_for text[] not null default '{}' check (cardinality(looking_for) <= 10 and private.short_items(looking_for, 60)),
  offering text[] not null default '{}' check (cardinality(offering) <= 10 and private.short_items(offering, 60)),
  is_public boolean not null default true,
  -- Preenchidos só pelo servidor (service role), nunca pelo app:
  skr_name text,
  seeker_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_touch before update on public.profiles
for each row execute function private.touch_updated_at();

-- Cria o perfil quando alguém entra pela primeira vez com a carteira.
-- O endereço vem da identidade web3 criada pelo Supabase Auth após verificar a assinatura.
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_wallet text;
begin
  if (new.raw_user_meta_data ->> 'sub') like 'web3:solana:%' then
    v_wallet := split_part(new.raw_user_meta_data ->> 'sub', ':', 3);
  elsif (new.raw_user_meta_data #>> '{custom_claims,chain}') = 'solana' then
    v_wallet := new.raw_user_meta_data #>> '{custom_claims,address}';
  end if;

  if v_wallet is not null and private.is_solana_address(v_wallet) then
    insert into public.profiles (id, wallet) values (new.id, v_wallet)
    on conflict do nothing;
  end if;
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- Garantia caso o trigger não encontre o endereço: lê a identidade web3 do usuário logado.
create function public.ensure_profile() returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_wallet text;
  v_row public.profiles;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into v_row from public.profiles where id = v_uid;
  if found then
    return v_row;
  end if;

  select coalesce(
           case when i.provider_id like 'web3:solana:%' then split_part(i.provider_id, ':', 3) end,
           case when (i.identity_data #>> '{custom_claims,chain}') = 'solana' then i.identity_data #>> '{custom_claims,address}' end
         )
    into v_wallet
  from auth.identities as i
  where i.user_id = v_uid and i.provider = 'web3'
  limit 1;

  if v_wallet is null or not private.is_solana_address(v_wallet) then
    raise exception 'no solana wallet identity' using errcode = '28000';
  end if;

  insert into public.profiles (id, wallet) values (v_uid, v_wallet)
  on conflict (id) do nothing;
  select * into v_row from public.profiles where id = v_uid;
  return v_row;
end $$;

-- ---------------------------------------------------------------------------
-- Eventos
-- ---------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 80),
  description text check (char_length(description) <= 500),
  location text check (char_length(location) <= 120),
  starts_at timestamptz,
  ends_at timestamptz,
  join_code text not null unique default private.new_join_code(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at is null or ends_at is null or ends_at >= starts_at)
);

create trigger events_touch before update on public.events
for each row execute function private.touch_updated_at();

create table public.event_attendees (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  visible boolean not null default true,
  joined_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index event_attendees_user_idx on public.event_attendees (user_id);

-- Helper usado nas policies (security definer evita recursão de RLS).
create function private.is_attendee(p_event uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.event_attendees
    where event_id = p_event and user_id = (select auth.uid())
  );
$$;
grant execute on function private.is_attendee(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Conexões (cada pessoa tem a própria linha, com as próprias notas)
-- ---------------------------------------------------------------------------
create table public.connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  contact_id uuid not null references public.profiles (id) on delete cascade,
  event_id uuid references public.events (id) on delete set null,
  verified boolean not null default false,
  method text not null check (method in ('live_qr', 'badge')),
  note text check (char_length(note) <= 2000),
  tags text[] not null default '{}' check (cardinality(tags) <= 20 and private.short_items(tags, 40)),
  met_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, contact_id),
  check (owner_id <> contact_id)
);

create index connections_contact_idx on public.connections (contact_id);
create index connections_event_idx on public.connections (event_id);

create trigger connections_touch before update on public.connections
for each row execute function private.touch_updated_at();

-- Helper: quem está logado pode ver o perfil p_profile se for o próprio, se um salvou
-- o outro, ou se os dois estão no mesmo evento e p_profile aparece na lista do evento.
-- Não existe listagem geral de perfis: isso impede que alguém raspe a base inteira.
create function private.can_see_profile(p_profile uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_profile = (select auth.uid())
    or exists (
      select 1 from public.connections
      where (owner_id = (select auth.uid()) and contact_id = p_profile)
         or (owner_id = p_profile and contact_id = (select auth.uid()))
    )
    or exists (
      select 1
      from public.event_attendees as them
      join public.event_attendees as me on me.event_id = them.event_id
      where them.user_id = p_profile and them.visible and me.user_id = (select auth.uid())
    );
$$;
grant execute on function private.can_see_profile(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Privilégios: revoga o padrão do Supabase e concede só o necessário
-- ---------------------------------------------------------------------------
revoke all on public.profiles, public.events, public.event_attendees, public.connections from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (handle, display_name, headline, bio, avatar_url, company, location, links, skills, looking_for, offering, is_public)
  on public.profiles to authenticated;

grant select on public.events to authenticated;
grant update (name, description, location, starts_at, ends_at) on public.events to authenticated;
grant delete on public.events to authenticated;

grant select on public.event_attendees to authenticated;
grant update (visible) on public.event_attendees to authenticated;

grant select, delete on public.connections to authenticated;
grant update (note, tags) on public.connections to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_attendees enable row level security;
alter table public.connections enable row level security;

create policy profiles_select_related on public.profiles
  for select to authenticated
  using (private.can_see_profile(id));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy events_select on public.events
  for select to authenticated
  using (created_by = (select auth.uid()) or private.is_attendee(id));

create policy events_update_own on public.events
  for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

create policy events_delete_own on public.events
  for delete to authenticated
  using (created_by = (select auth.uid()));

create policy attendees_select on public.event_attendees
  for select to authenticated
  using (user_id = (select auth.uid()) or (visible and private.is_attendee(event_id)));

create policy attendees_update_own on public.event_attendees
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy connections_select_own on public.connections
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy connections_update_own on public.connections
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy connections_delete_own on public.connections
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- RPCs (únicas portas de escrita para conexões e eventos)
-- ---------------------------------------------------------------------------

-- Perfil por handle (página pública /u/:handle e crachá impresso). Um por vez, sem listagem.
create function public.get_profile(p_handle text) returns setof public.profiles
language sql stable security definer set search_path = '' as $$
  select p.*
  from public.profiles as p
  where p.handle = lower(p_handle)
    and (p.is_public or ((select auth.uid()) is not null and private.can_see_profile(p.id)))
  limit 1;
$$;

-- Token do QR dinâmico: "<janela>.<assinatura>", janela de 30 s.
create function public.live_qr_token() returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_window bigint := floor(extract(epoch from now()) / 30);
  v_key bytea;
begin
  if v_uid is null or not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'profile required' using errcode = '28000';
  end if;
  select value into v_key from private.secrets where name = 'qr_hmac_key';
  return v_window::text || '.' || substr(encode(
    extensions.hmac(convert_to(v_uid::text || ':' || v_window::text, 'UTF8'), v_key, 'sha256'), 'hex'), 1, 20);
end $$;

-- Conectar com alguém pelo handle.
--   * Com token válido (QR ao vivo, até ~90 s): conexão verificada e mútua.
--   * Sem token (crachá impresso/link): só quem escaneou salva o contato, e só de perfil público.
create function public.connect(p_handle text, p_token text default null, p_event_id uuid default null)
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
  v_row public.connections;
begin
  if v_me is null or not exists (select 1 from public.profiles where id = v_me) then
    raise exception 'profile required' using errcode = '28000';
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

  -- Só anexa um evento do qual quem escaneou participa.
  if p_event_id is not null
     and exists (select 1 from public.event_attendees where event_id = p_event_id and user_id = v_me) then
    v_event := p_event_id;
  end if;

  insert into public.connections (owner_id, contact_id, event_id, verified, method)
  values (v_me, v_contact, v_event, v_verified, case when v_verified then 'live_qr' else 'badge' end)
  on conflict (owner_id, contact_id) do update
    set verified = public.connections.verified or excluded.verified,
        method = case when excluded.verified then 'live_qr' else public.connections.method end,
        event_id = coalesce(public.connections.event_id, excluded.event_id)
  returning * into v_row;

  if v_verified then
    insert into public.connections (owner_id, contact_id, event_id, verified, method)
    values (
      v_contact, v_me,
      case when v_event is not null
             and exists (select 1 from public.event_attendees where event_id = v_event and user_id = v_contact)
           then v_event end,
      true, 'live_qr')
    on conflict (owner_id, contact_id) do update
      set verified = true, method = 'live_qr';
  end if;

  return v_row;
end $$;

create function public.create_event(
  p_name text,
  p_description text default null,
  p_location text default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null
) returns public.events
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_row public.events;
begin
  if v_me is null or not exists (select 1 from public.profiles where id = v_me) then
    raise exception 'profile required' using errcode = '28000';
  end if;
  if (select count(*) from public.events where created_by = v_me and created_at > now() - interval '1 day') >= 10 then
    raise exception 'too many events today' using errcode = '54000';
  end if;

  insert into public.events (name, description, location, starts_at, ends_at, created_by)
  values (p_name, p_description, p_location, p_starts_at, p_ends_at, v_me)
  returning * into v_row;

  insert into public.event_attendees (event_id, user_id) values (v_row.id, v_me);
  return v_row;
end $$;

create function public.join_event(p_code text) returns public.events
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_row public.events;
begin
  if v_me is null or not exists (select 1 from public.profiles where id = v_me) then
    raise exception 'profile required' using errcode = '28000';
  end if;

  select * into v_row from public.events where join_code = upper(trim(p_code));
  if not found then
    raise exception 'event not found' using errcode = 'P0002';
  end if;

  insert into public.event_attendees (event_id, user_id) values (v_row.id, v_me)
  on conflict do nothing;
  return v_row;
end $$;

revoke execute on function public.get_profile(text) from public;
grant execute on function public.get_profile(text) to anon, authenticated;

revoke execute on function public.ensure_profile() from public, anon;
revoke execute on function public.live_qr_token() from public, anon;
revoke execute on function public.connect(text, text, uuid) from public, anon;
revoke execute on function public.create_event(text, text, text, timestamptz, timestamptz) from public, anon;
revoke execute on function public.join_event(text) from public, anon;

grant execute on function public.ensure_profile() to authenticated;
grant execute on function public.live_qr_token() to authenticated;
grant execute on function public.connect(text, text, uuid) to authenticated;
grant execute on function public.create_event(text, text, text, timestamptz, timestamptz) to authenticated;
grant execute on function public.join_event(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Tempo real: quem mostra o QR vê a conexão chegar (respeita RLS)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.connections;

-- ---------------------------------------------------------------------------
-- Fotos de perfil: bucket público, cada usuário só escreve na própria pasta
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy avatars_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy avatars_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
