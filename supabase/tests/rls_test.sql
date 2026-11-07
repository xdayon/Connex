-- Testes de segurança do esquema (RLS, privilégios e RPCs).
-- Rodam dentro de uma transação e desfazem tudo no fim (seguro em qualquer banco).
-- Uso: psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql
-- Qualquer falha interrompe com "FAIL: ...".

begin;

-- Usuários de teste: A e B entram com carteira; C é uma conta sem carteira; D é um estranho.
insert into auth.users (id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', '{"sub":"web3:solana:4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T"}'),
  ('00000000-0000-0000-0000-00000000000b', '{"custom_claims":{"chain":"solana","address":"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"}}'),
  ('00000000-0000-0000-0000-00000000000c', '{"email":"c@example.com"}'),
  ('00000000-0000-0000-0000-00000000000d', '{"sub":"web3:solana:So11111111111111111111111111111111111111112"}');

do $$ begin
  if (select count(*) from public.profiles where id::text like '00000000-0000-0000-0000-00000000000%') <> 3 then
    raise exception 'FAIL: esperado 3 perfis de teste criados pelo trigger';
  end if;
  if exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-00000000000c') then
    raise exception 'FAIL: conta sem carteira ganhou perfil';
  end if;
end $$;

-- ---------------------------------------------------------------- B prepara o perfil
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
update public.profiles set handle = 'bob', display_name = 'Bob', links = '{"github":"https://github.com/bob"}' where id = auth.uid();

-- ---------------------------------------------------------------- A
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);

update public.profiles set handle = 'alice', display_name = 'Alice' where id = auth.uid();

do $$ begin
  begin
    update public.profiles set wallet = 'Vote111111111111111111111111111111111111111' where id = auth.uid();
    raise exception 'FAIL: usuário trocou a própria carteira';
  exception when insufficient_privilege then null; end;

  begin
    update public.profiles set seeker_verified = true where id = auth.uid();
    raise exception 'FAIL: usuário se deu o selo Seeker';
  exception when insufficient_privilege then null; end;

  begin
    update public.profiles set links = '{"website":"javascript:alert(1)"}' where id = auth.uid();
    raise exception 'FAIL: link javascript: aceito';
  exception when check_violation then null; end;

  begin
    update public.profiles set links = '{"evil":"https://x.com/a"}' where id = auth.uid();
    raise exception 'FAIL: chave de link desconhecida aceita';
  exception when check_violation then null; end;

  begin
    perform * from private.secrets;
    raise exception 'FAIL: segredo do QR legível';
  exception when insufficient_privilege then null; end;

  begin
    insert into public.connections (owner_id, contact_id, verified, method)
    values (auth.uid(), '00000000-0000-0000-0000-00000000000b', true, 'live_qr');
    raise exception 'FAIL: inserção direta de conexão permitida';
  exception when insufficient_privilege then null; end;

  if (select count(*) from public.profiles) <> 1 then
    raise exception 'FAIL: A enxerga perfis sem relação (% linhas)', (select count(*) from public.profiles);
  end if;

  if (select count(*) from public.get_profile('bob')) <> 1 then
    raise exception 'FAIL: get_profile não achou perfil público';
  end if;

  begin
    perform public.connect('bob', '123.aaaaaaaaaaaaaaaaaaaa');
    raise exception 'FAIL: token de QR falso aceito';
  exception when invalid_parameter_value then null; end;
end $$;

-- ---------------------------------------------------------------- B mostra o QR ao vivo; A escaneia
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
create temp table qr as select public.live_qr_token() as token;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
do $$
declare c public.connections;
begin
  c := public.connect('BOB', (select token from qr));
  if not c.verified or c.method <> 'live_qr' then
    raise exception 'FAIL: QR ao vivo não gerou conexão verificada';
  end if;

  update public.connections set note = 'dev Rust, quer cofundador' where id = c.id;

  begin
    update public.connections set verified = false where id = c.id;
    raise exception 'FAIL: usuário alterou o campo verified';
  exception when insufficient_privilege then null; end;

  if (select count(*) from public.connections) <> 1 then
    raise exception 'FAIL: A enxerga conexões de outros';
  end if;
  if (select count(*) from public.profiles) <> 2 then
    raise exception 'FAIL: A deveria enxergar o próprio perfil e o de B';
  end if;
end $$;

-- ---------------------------------------------------------------- B recebeu a conexão recíproca, sem a nota de A
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$ begin
  if (select count(*) from public.connections where contact_id = '00000000-0000-0000-0000-00000000000a' and verified) <> 1 then
    raise exception 'FAIL: B não recebeu a conexão recíproca';
  end if;
  if exists (select 1 from public.connections where note is not null) then
    raise exception 'FAIL: B lê a nota privada de A';
  end if;
end $$;

-- B fica privado: anônimos deixam de achar; A (conectado) continua vendo.
update public.profiles set is_public = false where id = auth.uid();

-- ---------------------------------------------------------------- Eventos
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
create temp table ev as select * from public.create_event('IslandDAO Floripa');

-- Agora A enxerga B (estão conectados), mas continua sem poder editar B.
update public.profiles set display_name = 'hacked' where id = '00000000-0000-0000-0000-00000000000b';

do $$ begin
  if (select count(*) from public.get_profile('bob')) <> 1 then
    raise exception 'FAIL: A perdeu acesso ao perfil privado de B, com quem está conectado';
  end if;
end $$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', false);
do $$ begin
  if (select count(*) from public.events) <> 0 then
    raise exception 'FAIL: D vê evento do qual não participa';
  end if;
  if (select count(*) from public.get_profile('bob')) <> 0 then
    raise exception 'FAIL: D acha perfil privado de B';
  end if;
  begin
    perform public.connect('bob');
    raise exception 'FAIL: D conectou com perfil privado sem QR ao vivo';
  exception when no_data_found then null; end;

  perform public.join_event(lower((select join_code from ev)));
  if (select count(*) from public.events) <> 1 then
    raise exception 'FAIL: D entrou no evento mas não o vê';
  end if;
  -- Estar no mesmo evento não libera o perfil: só conexão (ou o próprio) libera.
  if exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-00000000000a') then
    raise exception 'FAIL: D vê o perfil de A só por estar no mesmo evento';
  end if;
  -- connect sem token só com perfil público: A é público
  perform public.connect('alice', null, (select id from ev));
  if (select event_id from public.connections where contact_id = '00000000-0000-0000-0000-00000000000a') is distinct from (select id from ev) then
    raise exception 'FAIL: conexão de crachá não guardou o evento';
  end if;
  if (select verified from public.connections where contact_id = '00000000-0000-0000-0000-00000000000a') then
    raise exception 'FAIL: conexão de crachá impresso marcada como verificada';
  end if;
end $$;

-- ---------------------------------------------------------------- v2: eventos listados, event_people, check_in, links
-- O service role marca eventos como listados (aqui, como superusuário). B e A ficam privados/públicos
-- conforme o cenário e voltam ao estado original no fim da seção.
reset role;
insert into public.events (name, created_by, listed)
  values ('Listed Live Event', '00000000-0000-0000-0000-00000000000b', true),
         ('Unlisted Event', '00000000-0000-0000-0000-00000000000b', false);
create temp table v2ids as
  select (select id from public.events where name = 'Listed Live Event') as listed_id,
         (select id from public.events where name = 'Unlisted Event') as unlisted_id;
grant select on v2ids to authenticated;
update public.profiles set is_public = true, skills = '{Rust}' where id = '00000000-0000-0000-0000-00000000000b';
update public.profiles set is_public = false where id = '00000000-0000-0000-0000-00000000000a';

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', false);
-- D só conhecia A por ter conectado pelo crachá; remove a conexão para testar só a presença no evento.
delete from public.connections where owner_id = auth.uid();
update public.profiles set handle = 'dave' where id = auth.uid();
do $$ begin
  if (select count(*) from public.events where name = 'Listed Live Event') <> 1 then
    raise exception 'FAIL: evento listado invisível para autenticado';
  end if;
  if exists (select 1 from public.events where name = 'Unlisted Event') then
    raise exception 'FAIL: evento não listado visível para estranho';
  end if;

  begin
    update public.events set listed = true where name = 'IslandDAO Floripa';
    raise exception 'FAIL: usuário alterou events.listed';
  exception when insufficient_privilege then null; end;

  begin
    perform public.check_in((select unlisted_id from v2ids));
    raise exception 'FAIL: check_in em evento não listado';
  exception when no_data_found then null; end;

  begin
    perform * from public.event_people((select listed_id from v2ids));
    raise exception 'FAIL: event_people aceitou não participante';
  exception when no_data_found then null; end;

  perform public.check_in((select listed_id from v2ids));
  perform public.check_in((select listed_id from v2ids)); -- idempotente
  if (select count(*) from public.event_attendees where event_id = (select listed_id from v2ids) and user_id = auth.uid()) <> 1 then
    raise exception 'FAIL: check_in não registrou presença única';
  end if;
end $$;

-- Links: discord aceita nome de usuário puro; nos outros, só https; javascript: segue barrado.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
update public.profiles set links = '{"github":"https://github.com/alice","discord":"alice_dc","calendar":"https://cal.com/alice"}'
  where id = auth.uid();
do $$ begin
  begin
    update public.profiles set links = '{"discord":"javascript:alert(1)"}' where id = auth.uid();
    raise exception 'FAIL: discord com javascript: aceito';
  exception when check_violation then null; end;
  begin
    update public.profiles set links = '{"github":"alice"}' where id = auth.uid();
    raise exception 'FAIL: nome puro aceito fora do discord';
  exception when check_violation then null; end;
  perform public.check_in((select listed_id from v2ids));
end $$;

-- B (público) também faz check-in.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
select public.check_in((select listed_id from v2ids));

-- D vê A e B em event_people, mas não lê as linhas de profiles antes de conectar.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', false);
do $$ begin
  if not exists (select 1 from public.event_people((select listed_id from v2ids)) where handle = 'alice' and not is_me and not in_network) then
    raise exception 'FAIL: event_people não lista A';
  end if;
  if not exists (select 1 from public.event_people((select listed_id from v2ids)) where is_me and handle = 'dave') then
    raise exception 'FAIL: event_people não devolveu a própria linha';
  end if;
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'event_people'
      and p.proargnames && array['wallet', 'links', 'bio', 'location']
  ) then
    raise exception 'FAIL: event_people expõe coluna sensível';
  end if;
  if exists (select 1 from public.profiles where id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b')) then
    raise exception 'FAIL: co-participante lê profiles sem conexão';
  end if;

  begin
    perform public.connect('alice', null, (select listed_id from v2ids));
    raise exception 'FAIL: D conectou com perfil privado sem QR';
  exception when no_data_found then null; end;

  perform public.connect('bob', null, (select listed_id from v2ids));
  if (select count(*) from public.profiles where id = '00000000-0000-0000-0000-00000000000b') <> 1 then
    raise exception 'FAIL: D não vê B depois de desbloquear';
  end if;
  if not exists (select 1 from public.event_people((select listed_id from v2ids)) where handle = 'bob' and in_network) then
    raise exception 'FAIL: in_network não marcado após conectar';
  end if;
end $$;

-- Restaura o estado esperado pelas seções seguintes (A público, B privado).
reset role;
update public.profiles set is_public = true where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set is_public = false where id = '00000000-0000-0000-0000-00000000000b';

-- ---------------------------------------------------------------- C (sem carteira) não faz nada
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
do $$ begin
  begin
    perform public.live_qr_token();
    raise exception 'FAIL: conta sem carteira gerou QR';
  exception when invalid_authorization_specification then null; end;
  begin
    perform public.ensure_profile();
    raise exception 'FAIL: ensure_profile criou perfil sem identidade de carteira';
  exception when invalid_authorization_specification then null; end;
end $$;

-- ---------------------------------------------------------------- v3: compartilhamento seletivo
-- E mostra o QR liberando WhatsApp e GitHub (esconde o LinkedIn); F escaneia liberando só o Telegram.
reset role;
insert into auth.users (id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', '{"sub":"web3:solana:Stake11111111111111111111111111111111111111"}'),
  ('00000000-0000-0000-0000-0000000000f1', '{"sub":"web3:solana:Config1111111111111111111111111111111111111"}');

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f1', false);
update public.profiles set handle = 'fred',
  links = '{"telegram":"https://t.me/fred","whatsapp":"https://wa.me/5548999990000"}' where id = auth.uid();

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false);
update public.profiles set handle = 'erin', share_hidden = '{whatsapp,linkedin}',
  links = '{"whatsapp":"https://wa.me/5511988887777","github":"https://github.com/erin","linkedin":"https://www.linkedin.com/in/erin","steam":"https://steamcommunity.com/id/erin"}'
  where id = auth.uid();

do $$ begin
  begin
    perform links from public.profiles where id = auth.uid();
    raise exception 'FAIL: links legíveis por SELECT direto';
  exception when insufficient_privilege then null; end;
  begin
    perform wallet from public.profiles where id = auth.uid();
    raise exception 'FAIL: carteira legível por SELECT direto';
  exception when insufficient_privilege then null; end;
  if not ((select links from public.my_profile()) ? 'whatsapp') then
    raise exception 'FAIL: my_profile não devolve os próprios links';
  end if;
  begin
    update public.profiles set share_hidden = '{evil}' where id = auth.uid();
    raise exception 'FAIL: chave desconhecida aceita no padrão';
  exception when check_violation then null; end;
  begin
    perform public.live_qr_token(array['evil']);
    raise exception 'FAIL: seleção inválida aceita no QR';
  exception when invalid_parameter_value then null; end;
end $$;

create temp table qr3 as select public.live_qr_token(array['whatsapp', 'github']) as token;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f1', false);
do $$
declare
  c public.connections;
  l jsonb;
begin
  c := public.connect('erin', (select token from qr3), null, array['telegram']);
  l := public.shared_links(c);
  if not (l ? 'whatsapp' and l ? 'github') or l ? 'linkedin' or l ? 'steam' then
    raise exception 'FAIL: F recebeu a seleção errada de E: %', l;
  end if;
  if public.shared_wallet(c) is not null then
    raise exception 'FAIL: carteira de E liberada sem estar na seleção';
  end if;
  -- Forjar a linha não adianta: a função relê a conexão real pelo id.
  c.shared_keys := private.share_keys();
  if public.shared_links(c) ? 'linkedin' then
    raise exception 'FAIL: shared_links confiou na linha forjada';
  end if;
end $$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false);
do $$
declare l jsonb;
begin
  select public.shared_links(c) into l from public.connections as c
  where c.contact_id = '00000000-0000-0000-0000-0000000000f1';
  if l is distinct from '{"telegram":"https://t.me/fred"}'::jsonb then
    raise exception 'FAIL: E recebeu a seleção errada de F: %', l;
  end if;
end $$;

-- Página pública: o padrão de E (sem WhatsApp e sem LinkedIn).
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$
declare p public.profiles;
begin
  select * into p from public.get_profile('erin');
  if p.links ? 'whatsapp' or p.links ? 'linkedin' or not (p.links ? 'github') or p.share_hidden <> '{}' then
    raise exception 'FAIL: página pública vaza o que E escondeu: %', p.links;
  end if;
end $$;

-- ---------------------------------------------------------------- Anônimo
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
  begin
    perform * from public.profiles;
    raise exception 'FAIL: anônimo lista perfis';
  exception when insufficient_privilege then null; end;
  begin
    perform public.connect('alice');
    raise exception 'FAIL: anônimo chamou connect';
  exception when insufficient_privilege then null; end;
  if (select count(*) from public.get_profile('alice')) <> 1 then
    raise exception 'FAIL: anônimo não abre perfil público por handle';
  end if;
  if (select count(*) from public.get_profile('bob')) <> 0 then
    raise exception 'FAIL: anônimo abre perfil privado';
  end if;
end $$;

reset role;
do $$ begin
  if (select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000b') <> 'Bob' then
    raise exception 'FAIL: A editou o perfil de B';
  end if;
end $$;
select 'ALL RLS TESTS PASSED' as result;
rollback;
