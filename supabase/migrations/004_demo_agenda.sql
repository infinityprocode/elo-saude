-- Elo Saúde · demonstração viva: a agenda fictícia acompanha o dia corrente durante a avaliação.
-- Move as consultas do último dia com agenda para hoje (fuso de São Paulo). Só existe porque é demo.
create or replace function demo_agenda_do_dia() returns void language plpgsql security definer set search_path = public as $$
declare hoje date := (now() at time zone 'America/Sao_Paulo')::date; ultimo date;
begin
  select max((inicio at time zone 'America/Sao_Paulo')::date) into ultimo from agenda;
  if ultimo is null or ultimo >= hoje then return; end if;
  update agenda set inicio = inicio + ((hoje - ultimo) * interval '1 day')
   where (inicio at time zone 'America/Sao_Paulo')::date = ultimo;
end $$;
revoke all on function demo_agenda_do_dia() from public, anon;
grant execute on function demo_agenda_do_dia() to authenticated;
