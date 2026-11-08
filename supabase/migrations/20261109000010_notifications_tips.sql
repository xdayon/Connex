-- Notificações dentro do app e registro verificado das gorjetas.
-- A gorjeta é uma transferência SOL direta; o Worker confere a transação na rede e só então
-- grava aqui (tip_record), para que quem recebe seja avisado sem confiar no cliente.

create table public.tips (
  id uuid primary key default gen_random_uuid(),
  cluster text not null check (cluster in ('devnet', 'mainnet')),
  from_user uuid not null references public.profiles (id) on delete cascade,
  to_user uuid not null references public.profiles (id) on delete cascade,
  from_wallet text not null check (private.is_solana_address(from_wallet)),
  to_wallet text not null check (private.is_solana_address(to_wallet)),
  lamports bigint not null check (lamports > 0),
  signature text not null unique check (signature ~ '^[1-9A-HJ-NP-Za-km-z]{64,90}$'),
  created_at timestamptz not null default now(),
  check (from_user <> to_user)
);

create index tips_to_user_idx on public.tips (to_user, created_at desc);

alter table public.tips enable row level security;
revoke all on public.tips from public, anon, authenticated;
grant select on public.tips to authenticated;

create policy tips_select on public.tips for select to authenticated
using (from_user = (select auth.uid()) or to_user = (select auth.uid()));

-- Só o Worker grava (com o segredo do servidor), em nome de quem mandou a gorjeta.
create function public.tip_record(
  p_secret text,
  p_cluster text,
  p_signature text,
  p_to_user uuid,
  p_from_wallet text,
  p_to_wallet text,
  p_lamports bigint
) returns public.tips
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_row public.tips;
begin
  if not private.is_server(p_secret) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_me is null then
    raise exception 'login required' using errcode = '28000';
  end if;
  if p_cluster is null or p_cluster not in ('devnet', 'mainnet') then
    raise exception 'invalid cluster' using errcode = '22023';
  end if;
  if p_to_user is null or p_to_user = v_me then
    raise exception 'invalid recipient' using errcode = '22023';
  end if;
  if p_lamports is null or p_lamports <= 0 then
    raise exception 'invalid amount' using errcode = '22023';
  end if;
  if p_from_wallet is distinct from (select wallet from public.profiles where id = v_me) then
    raise exception 'sender wallet mismatch' using errcode = '22023';
  end if;
  if p_to_wallet is distinct from (select wallet from public.profiles where id = p_to_user) then
    raise exception 'recipient wallet mismatch' using errcode = '22023';
  end if;

  insert into public.tips (cluster, from_user, to_user, from_wallet, to_wallet, lamports, signature)
  values (p_cluster, v_me, p_to_user, p_from_wallet, p_to_wallet, p_lamports, p_signature)
  on conflict (signature) do nothing
  returning * into v_row;

  if v_row.id is null then
    select * into v_row from public.tips where signature = p_signature;
  end if;
  return v_row;
end $$;

-- Feed de notificações de quem está logado: conexões recebidas, selos e gorjetas.
create function public.notifications_feed(p_cluster text, p_since timestamptz default now() - interval '30 days')
returns table (
  kind text,
  at timestamptz,
  actor_id uuid,
  actor_handle text,
  actor_name text,
  actor_avatar text,
  connection_id uuid,
  verified boolean,
  lamports bigint,
  signature text
)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'login required' using errcode = '28000';
  end if;
  return query
  with raw as (
    select 'connected'::text as kind, c.created_at as at, c.owner_id as actor_id,
           c.verified as verified, null::bigint as lamports, null::text as signature
    from public.connections c
    where c.contact_id = v_me and c.owner_id <> v_me and c.created_at > p_since
    union all
    select case when m.id is not null then 'sealed' else 'seal_signed' end,
           case when m.id is not null then greatest(p.confirmed_at, m.confirmed_at) else p.confirmed_at end,
           p.user_id, null::boolean, null::bigint, p.signature
    from public.proofs p
    left join public.proofs m
      on m.kind = 'meet' and m.status = 'confirmed' and m.cluster = p.cluster
     and m.user_id = v_me and m.contact_id = p.user_id
    where p.kind = 'meet' and p.status = 'confirmed' and p.cluster = p_cluster
      and p.contact_id = v_me and p.confirmed_at > p_since
    union all
    select 'tip', t.created_at, t.from_user, null::boolean, t.lamports, t.signature
    from public.tips t
    where t.to_user = v_me and t.cluster = p_cluster and t.created_at > p_since
  )
  select r.kind, r.at, r.actor_id, pr.handle, pr.display_name, pr.avatar_url,
         (select mc.id from public.connections mc where mc.owner_id = v_me and mc.contact_id = r.actor_id),
         r.verified, r.lamports, r.signature
  from raw r
  join public.profiles pr on pr.id = r.actor_id
  order by r.at desc
  limit 50;
end $$;

revoke execute on function public.tip_record(text, text, text, uuid, text, text, bigint) from public, anon;
revoke execute on function public.notifications_feed(text, timestamptz) from public, anon;
grant execute on function public.tip_record(text, text, text, uuid, text, text, bigint) to authenticated;
grant execute on function public.notifications_feed(text, timestamptz) to authenticated;
