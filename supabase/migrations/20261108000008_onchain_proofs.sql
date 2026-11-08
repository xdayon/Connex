-- Provas na Solana (opcionais, pagas pelo conneX):
--   * meet:   selo de encontro. Cada pessoa assina uma transação com o Memo "conneX meet v1 <ref>";
--             o <ref> é o mesmo para os dois lados. O selo fecha quando os dois confirmaram.
--   * attend: presença em evento. Quem escaneia o QR de presença (rotativo, mostrado pelo
--             organizador no local) assina o Memo "conneX attend v1 <ref do evento>".
--
-- Segurança:
--   * O app só cria linhas pendentes, por funções que validam tudo (conexão verificada nos
--     dois sentidos, ou token de presença válido). Ninguém escreve direto na tabela.
--   * Só o servidor (Worker) marca uma prova como confirmada, depois de ver a transação
--     confirmada na rede. Ele se identifica com um segredo cujo hash fica em private.secrets.
--   * O Worker nunca assina uma transação que não tenha exatamente o formato esperado
--     (pagador + 1 signatário + 1 instrução de Memo com o texto desta prova).

create table public.proofs (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('meet', 'attend')),
  cluster text not null check (cluster in ('devnet', 'mainnet')),
  user_id uuid not null references public.profiles (id) on delete cascade,
  contact_id uuid references public.profiles (id) on delete cascade,
  event_id uuid references public.events (id) on delete cascade,
  ref text not null check (ref ~ '^[0-9a-f]{32}$'),
  wallet text not null check (private.is_solana_address(wallet)),
  status text not null default 'pending' check (status in ('pending', 'confirmed')),
  signature text check (signature ~ '^[1-9A-HJ-NP-Za-km-z]{64,90}$'),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  check (
    (kind = 'meet' and contact_id is not null and event_id is null and contact_id <> user_id)
    or (kind = 'attend' and event_id is not null and contact_id is null)
  ),
  check ((status = 'confirmed') = (signature is not null))
);

create unique index proofs_meet_uniq on public.proofs (cluster, user_id, contact_id) where kind = 'meet';
create unique index proofs_attend_uniq on public.proofs (cluster, user_id, event_id) where kind = 'attend';
create index proofs_contact_idx on public.proofs (contact_id) where contact_id is not null;
create index proofs_event_idx on public.proofs (event_id) where event_id is not null;

alter table public.proofs enable row level security;
revoke all on public.proofs from public, anon, authenticated;
grant select on public.proofs to authenticated;

-- Vejo as minhas provas e as provas de encontro em que a outra pessoa sou eu
-- (para saber se ela já assinou a parte dela).
create policy proofs_select on public.proofs
  for select to authenticated
  using (user_id = (select auth.uid()) or contact_id = (select auth.uid()));

-- Segredo do servidor: só o hash (sha256) fica no banco. O valor fica no cofre do Worker.
create function private.is_server(p_secret text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_secret is not null and exists (
    select 1 from private.secrets
    where name = 'proof_server_sha256'
      and value = extensions.digest(convert_to(p_secret, 'UTF8'), 'sha256')
  );
$$;

-- Token do QR de presença: "<janela>.<assinatura>", janela de 30 s. Só o organizador gera.
create function public.event_presence_token(p_event uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_window bigint := floor(extract(epoch from now()) / 30);
  v_key bytea;
begin
  if not exists (select 1 from public.events where id = p_event and created_by = auth.uid()) then
    raise exception 'event not found' using errcode = 'P0002';
  end if;
  select value into v_key from private.secrets where name = 'qr_hmac_key';
  return v_window::text || '.' || substr(encode(
    extensions.hmac(convert_to('presence:' || p_event::text || ':' || v_window::text, 'UTF8'), v_key, 'sha256'), 'hex'), 1, 20);
end $$;

-- Cria (ou reaproveita) a prova pendente de quem está logado e devolve o que o Worker
-- precisa para montar a transação. Chamada pelo Worker com o JWT do usuário.
--   meet:   p_contact = a outra pessoa; exige conexão verificada (QR ao vivo) nos dois sentidos.
--   attend: p_event + p_token = QR de presença válido (até ~2 min); faz o check-in junto.
create function public.proof_prepare(
  p_kind text, p_cluster text, p_contact uuid default null, p_event uuid default null, p_token text default null
) returns public.proofs
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_wallet text;
  v_ref text;
  v_window bigint;
  v_now bigint := floor(extract(epoch from now()) / 30);
  v_key bytea;
  v_row public.proofs;
begin
  select wallet into v_wallet from public.profiles where id = v_me and handle is not null;
  if v_wallet is null then
    raise exception 'profile required' using errcode = '28000';
  end if;
  if p_cluster not in ('devnet', 'mainnet') then
    raise exception 'invalid cluster' using errcode = '22023';
  end if;

  if p_kind = 'meet' then
    if p_contact is null or p_contact = v_me
       or not exists (select 1 from public.connections where owner_id = v_me and contact_id = p_contact and verified)
       or not exists (select 1 from public.connections where owner_id = p_contact and contact_id = v_me and verified) then
      raise exception 'verified connection required' using errcode = '22023';
    end if;
    select * into v_row from public.proofs
    where kind = 'meet' and cluster = p_cluster and user_id = v_me and contact_id = p_contact;
    if found then
      return v_row;
    end if;
    -- O mesmo ref dos dois lados: reaproveita o da outra pessoa, se ela começou primeiro.
    select ref into v_ref from public.proofs
    where kind = 'meet' and cluster = p_cluster and user_id = p_contact and contact_id = v_me;
    insert into public.proofs (kind, cluster, user_id, contact_id, ref, wallet)
    values ('meet', p_cluster, v_me, p_contact, coalesce(v_ref, encode(extensions.gen_random_bytes(16), 'hex')), v_wallet)
    on conflict do nothing
    returning * into v_row;
    if v_row.id is null then
      select * into v_row from public.proofs
      where kind = 'meet' and cluster = p_cluster and user_id = v_me and contact_id = p_contact;
    end if;
    return v_row;

  elsif p_kind = 'attend' then
    if p_event is null or not exists (select 1 from public.events where id = p_event) then
      raise exception 'event not found' using errcode = 'P0002';
    end if;
    select * into v_row from public.proofs
    where kind = 'attend' and cluster = p_cluster and user_id = v_me and event_id = p_event;
    if found then
      return v_row;
    end if;
    if p_token is null or p_token !~ '^[0-9]{1,12}\.[0-9a-f]{20}$' then
      raise exception 'invalid qr' using errcode = '22023';
    end if;
    v_window := split_part(p_token, '.', 1)::bigint;
    select value into v_key from private.secrets where name = 'qr_hmac_key';
    if v_window not between v_now - 4 and v_now
       or split_part(p_token, '.', 2) <> substr(encode(
         extensions.hmac(convert_to('presence:' || p_event::text || ':' || v_window::text, 'UTF8'), v_key, 'sha256'), 'hex'), 1, 20) then
      raise exception 'qr expired' using errcode = '22023';
    end if;
    insert into public.event_attendees (event_id, user_id) values (p_event, v_me)
    on conflict do nothing;
    insert into public.proofs (kind, cluster, user_id, event_id, ref, wallet)
    values ('attend', p_cluster, v_me, p_event, replace(p_event::text, '-', ''), v_wallet)
    on conflict do nothing
    returning * into v_row;
    if v_row.id is null then
      select * into v_row from public.proofs
      where kind = 'attend' and cluster = p_cluster and user_id = v_me and event_id = p_event;
    end if;
    return v_row;
  end if;

  raise exception 'invalid kind' using errcode = '22023';
end $$;

-- Só o Worker: devolve a prova pendente (para validar a transação assinada) ...
create function public.proof_for_server(p_secret text, p_id uuid) returns public.proofs
language plpgsql stable security definer set search_path = '' as $$
declare
  v_row public.proofs;
begin
  if not private.is_server(p_secret) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_row from public.proofs where id = p_id;
  if not found then
    raise exception 'proof not found' using errcode = 'P0002';
  end if;
  return v_row;
end $$;

-- ... e a marca como confirmada depois de ver a transação confirmada na rede.
create function public.proof_confirm(p_secret text, p_id uuid, p_signature text) returns public.proofs
language plpgsql security definer set search_path = '' as $$
declare
  v_row public.proofs;
begin
  if not private.is_server(p_secret) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.proofs
  set status = 'confirmed', signature = p_signature, confirmed_at = now()
  where id = p_id and status = 'pending'
  returning * into v_row;
  if not found then
    select * into v_row from public.proofs where id = p_id;
  end if;
  return v_row;
end $$;

revoke execute on function private.is_server(text) from public, anon, authenticated;
revoke execute on function public.event_presence_token(uuid) from public, anon;
revoke execute on function public.proof_prepare(text, text, uuid, uuid, text) from public, anon;
revoke execute on function public.proof_for_server(text, uuid) from public;
revoke execute on function public.proof_confirm(text, uuid, text) from public;

grant execute on function public.event_presence_token(uuid) to authenticated;
grant execute on function public.proof_prepare(text, text, uuid, uuid, text) to authenticated;
-- O Worker chama estas duas sem login (chave publicável); o segredo é a autorização.
grant execute on function public.proof_for_server(text, uuid) to anon;
grant execute on function public.proof_confirm(text, uuid, text) to anon;
