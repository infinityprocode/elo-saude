-- Elo Saúde · compartilhamento por QR.
-- O paciente gera um consentimento "em aberto" (com token e prazo, sem destinatário). O QR leva ao link /c/<token>.
-- O profissional que lê o QR, logado, aceita: o consentimento passa a ser dele, o paciente entra na carteira dele
-- e tudo fica na auditoria. Antes de aceitar, ele vê só o primeiro nome e a validade.

create or replace function previa_compartilhamento(tok text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('primeiro_nome', split_part(p.nome, ' ', 1), 'fim', c.fim, 'escopo', c.escopo)
  from consentimentos c join pacientes p on p.id = c.paciente_id
  where c.token = tok and c.escopo = 'completo' and c.revogado_em is null and now() between c.inicio and c.fim
    and c.profissional_id is null and c.organizacao_id is null
$$;

create or replace function aceitar_compartilhamento(tok text) returns uuid language plpgsql security definer set search_path = public as $$
declare k consentimentos; prof profissionais;
begin
  select * into prof from profissionais where id = eu_profissional();
  if prof.id is null then raise exception 'só profissionais podem receber um compartilhamento' using errcode = 'insufficient_privilege'; end if;
  select * into k from consentimentos where token = tok and escopo = 'completo' and revogado_em is null and now() between inicio and fim
    and profissional_id is null and organizacao_id is null for update;
  if k.id is null then return null; end if;   -- usado, vencido, revogado ou inexistente
  update consentimentos set profissional_id = prof.id where id = k.id;
  insert into carteiras (paciente_id, profissional_id) values (k.paciente_id, prof.id) on conflict do nothing;
  insert into acessos (paciente_id, ator_user_id, ator_nome, ator_registro, consentimento_id, acao)
  values (k.paciente_id, auth.uid(), prof.nome, prof.conselho || ' ' || prof.numero || '-' || prof.uf, k.id, 'consentiu');
  return k.paciente_id;
end $$;

revoke all on function previa_compartilhamento(text), aceitar_compartilhamento(text) from public, anon;
grant execute on function previa_compartilhamento(text), aceitar_compartilhamento(text) to authenticated;
