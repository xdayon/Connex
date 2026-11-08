-- Connex v4b: aniversário em partes (dia, mês e ano), cada uma opcional.
-- O que a pessoa preencher é público como o resto do perfil (headline, empresa...).
-- Substitui, no app, a coluna birthday de 20261108000005 (data única, privada), que fica sem uso
-- e sem dados; removê-la (e public.shared_birthday) numa limpeza futura.

alter table public.profiles
  add column birth_day smallint check (birth_day between 1 and 31),
  add column birth_month smallint check (birth_month between 1 and 12),
  add column birth_year smallint check (birth_year between 1900 and 2100),
  -- Dia e mês juntos precisam existir (29/02 vale sem ano; com ano, só em ano bissexto).
  add constraint profiles_birth_valid check (
    birth_day is null or birth_month is null or (
      birth_day <= (array[31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31])[birth_month]
      and (birth_year is null or birth_day <= extract(day from
            (make_date(birth_year, birth_month, 1) + interval '1 month' - interval '1 day')))
    )
  );

grant select (birth_day, birth_month, birth_year) on public.profiles to authenticated;
grant update (birth_day, birth_month, birth_year) on public.profiles to authenticated;
