-- Elo Saúde · recepção e gestor da clínica (P-ELO-03, 24/11/2026).
-- Recepção: já lê e atualiza a AGENDA da organização (políticas da 003), nunca o dossiê.
-- Gestor: vê a operação da clínica em números agregados e a equipe, sem nenhum dado clínico.
-- Tudo passa por esta função, que confere o papel de gestor ATIVO daquela organização.

create or replace function painel_gestor(org uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  r jsonb;
begin
  if not exists (select 1 from equipe_org e where e.user_id = auth.uid() and e.organizacao_id = org and e.papel = 'gestor' and e.ativo) then
    raise exception 'só o gestor desta organização' using errcode = 'insufficient_privilege';
  end if;
  select jsonb_build_object(
    'organizacao', (select jsonb_build_object('nome', o.nome, 'cidade', o.cidade) from organizacoes o where o.id = org),
    'profissionais', coalesce((select jsonb_agg(jsonb_build_object(
        'nome', p.nome, 'registro', p.conselho || ' ' || p.numero || '-' || p.uf, 'especialidade', p.especialidade, 'desde', a.desde,
        'consultas_hoje', (select count(*) from agenda g where g.organizacao_id = org and g.profissional_id = p.id and (g.inicio at time zone 'America/Sao_Paulo')::date = hoje and g.status <> 'cancelado'),
        'atendidas_hoje', (select count(*) from agenda g where g.organizacao_id = org and g.profissional_id = p.id and (g.inicio at time zone 'America/Sao_Paulo')::date = hoje and g.status = 'atendido')
      ) order by p.nome) from atuacoes a join profissionais p on p.id = a.profissional_id where a.organizacao_id = org and a.ativo), '[]'),
    'equipe', coalesce((select jsonb_agg(jsonb_build_object('papel', e.papel, 'nome', coalesce(u.raw_user_meta_data ->> 'nome', split_part(u.email, '@', 1))) order by e.papel)
      from equipe_org e join auth.users u on u.id = e.user_id where e.organizacao_id = org and e.ativo), '[]'),
    'hoje', (select jsonb_build_object(
        'consultas', count(*) filter (where status <> 'cancelado'),
        'confirmadas', count(*) filter (where status in ('confirmado','aguardando','atendido')),
        'atendidas', count(*) filter (where status = 'atendido'),
        'faltas', count(*) filter (where status = 'faltou'))
      from agenda where organizacao_id = org and (inicio at time zone 'America/Sao_Paulo')::date = hoje),
    'semana', (select jsonb_build_object(
        'consultas', count(*) filter (where status <> 'cancelado'),
        'faltas', count(*) filter (where status = 'faltou'))
      from agenda where organizacao_id = org and inicio >= now() - interval '7 days' and inicio < now() + interval '1 day'),
    'consentimentos_ativos', (select count(*) from consentimentos c where c.organizacao_id = org and c.revogado_em is null and now() between c.inicio and c.fim),
    'acessos_7d', (select count(*) from acessos x join profissionais p on p.user_id = x.ator_user_id join atuacoes a on a.profissional_id = p.id and a.organizacao_id = org where x.em >= now() - interval '7 days')
  ) into r;
  return r;
end $$;

revoke all on function painel_gestor(uuid) from public, anon;
grant execute on function painel_gestor(uuid) to authenticated;
