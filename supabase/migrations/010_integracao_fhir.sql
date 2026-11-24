-- Elo Saúde · entrada FHIR de parceiros (P-ELO-02, 24/11/2026).
-- Um laboratório manda resultados em FHIR R4; o Elo acha o paciente pelo HMAC do CPF (sem guardar o número)
-- e junta os exames no dossiê certo. origem_ref evita duplicar o mesmo resultado reenviado.
alter table exames add column if not exists origem_ref text;
create unique index if not exists exames_origem_ref on exames (paciente_id, origem_ref) where origem_ref is not null;

-- a auditoria registra que a integração trouxe dados (o paciente vê em "Quem abriu")
alter table acessos drop constraint if exists acessos_acao_check;
alter table acessos add constraint acessos_acao_check
  check (acao in ('visualizou','registrou_atendimento','registrou_adendo','acesso_emergencia','consentiu','revogou','recebeu_integracao'));
