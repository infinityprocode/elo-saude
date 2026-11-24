-- Elo Saúde · suspender um remédio em uso a partir do atendimento (P-ELO-05, 24/11/2026).
-- O profissional não altera registros (o histórico é imutável). Suspender é um ato próprio, auditável:
-- exige consentimento ativo, um atendimento DELE para este paciente (o que motivou a suspensão),
-- e só encerra (ativo = false, fim = hoje), sem apagar. O dossiê mostra quem suspendeu e quando.

alter table medicamentos add column if not exists suspenso_em_atendimento uuid references atendimentos(id) on delete set null;

create or replace function suspender_medicamento(med uuid, atendimento uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  m medicamentos;
  prof uuid := eu_profissional();
  ok boolean;
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if prof is null then raise exception 'só profissionais suspendem remédios' using errcode = 'insufficient_privilege'; end if;
  select * into m from medicamentos where id = med for update;
  if m.id is null then return false; end if;
  if consentimento_ativo(m.paciente_id) is null then raise exception 'sem consentimento ativo' using errcode = 'insufficient_privilege'; end if;
  select exists (select 1 from atendimentos a where a.id = atendimento and a.paciente_id = m.paciente_id
                   and a.profissional_id = prof and a.origem = 'profissional') into ok;
  if not ok then raise exception 'atendimento inválido para esta suspensão' using errcode = 'insufficient_privilege'; end if;
  if not m.ativo or (m.fim is not null and m.fim < hoje) then return false; end if;
  update medicamentos set ativo = false, fim = hoje, suspenso_em_atendimento = atendimento where id = med;
  return true;
end $$;

revoke all on function suspender_medicamento(uuid, uuid) from public, anon;
grant execute on function suspender_medicamento(uuid, uuid) to authenticated;
