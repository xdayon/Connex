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
  if (select count(*) from public.profiles) <> 3 then
    raise exception 'FAIL: esperado 3 perfis criados pelo trigger, obtido %', (select count(*) from public.profiles);
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
  -- D agora está no mesmo evento que A (visível), então enxerga A.
  if (select count(*) from public.profiles where id = '00000000-0000-0000-0000-00000000000a') <> 1 then
    raise exception 'FAIL: D não vê A, participante do mesmo evento';
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
