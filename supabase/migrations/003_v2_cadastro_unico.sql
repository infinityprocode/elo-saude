-- Elo Saúde · banco v2: cadastro único com três contas (paciente, profissional, organização).
-- Recria o modelo do zero (até aqui só havia dados de demonstração). Ver docs/arquitetura (aba "Arquitetura v2").
--
-- Princípios:
--  1. Uma identidade por pessoa: CPF e CNS guardados só como HMAC (a chave fica no servidor, nunca no banco).
--  2. Uma identidade por profissional: conselho + número + UF. Atua em várias organizações e/ou consultório próprio.
--  3. Todo registro clínico guarda origem, autor, unidade e rede (SUS, particular, convênio).
--  4. Conteúdo clínico só com consentimento ativo do paciente (ou para o próprio paciente/responsável).
--  5. Recepção e gestão nunca leem dado clínico.
--  6. Registro de profissional não se altera nem se apaga: correção é adendo.
--  7. Auditoria só de inclusão: nem o dono do banco via API altera ou apaga.
-- Mapeamento FHIR R4 nos comentários de cada tabela.

drop table if exists acessos, agenda, exames, alergias, medicamentos, condicoes, adendos, atendimentos, documentos, consentimentos, carteiras, equipe_org, atuacoes, vinculos_paciente, compartilhamentos, membros, pacientes, profissionais, organizacoes cascade;
drop function if exists bloquear_alteracao(), proteger_atendimento_profissional(), eu_profissional(), e_dono(uuid), consentimento_ativo(uuid), pode_ver_clinico(uuid), minhas_orgs(), abrir_dossie(uuid), revogar_consentimento(uuid), cartao_emergencia(text, text, text) cascade;
drop function if exists public.e_membro(uuid) cascade;

create extension if not exists pgcrypto;

-- ===================== Identidades =====================

-- Organization
create table organizacoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null check (tipo in ('ubs','upa','hospital','clinica','consultorio','laboratorio')),
  rede text not null check (rede in ('publica','privada')),
  cnes text,
  cidade text not null,
  uf text not null default 'SP',
  criado_em timestamptz not null default now()
);

-- Patient
create table pacientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  nascimento date not null,
  sexo text check (sexo in ('F','M','O')),
  cpf_hmac text unique,              -- HMAC-SHA256(cpf, chave do servidor)
  cns_hmac text unique,              -- HMAC-SHA256(cns, chave do servidor)
  cpf_final text check (cpf_final ~ '^[0-9]{2}$'),
  peso_kg numeric(5,1),
  tipo_sanguineo text,
  cidade text,
  uf text default 'SP',
  contato_emergencia text,
  gestante boolean not null default false,
  criado_em timestamptz not null default now()
);

-- RelatedPerson: quem gerencia o dossiê (o titular ou o responsável)
create table vinculos_paciente (
  user_id uuid not null references auth.users(id) on delete cascade,
  paciente_id uuid not null references pacientes(id) on delete cascade,
  papel text not null check (papel in ('titular','responsavel')),
  criado_em timestamptz not null default now(),
  primary key (user_id, paciente_id)
);

-- Practitioner
create table profissionais (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  nome text not null,
  conselho text not null check (conselho in ('CRM','CRO','CRN','CRP','COREN','CREFITO')),
  numero text not null,
  uf text not null default 'SP',
  especialidade text,
  verificado boolean not null default false,  -- conferência no conselho fica para depois do hackathon
  criado_em timestamptz not null default now(),
  unique (conselho, numero, uf)
);

-- PractitionerRole: onde o profissional atende. organizacao_id nulo = consultório próprio (autônomo)
create table atuacoes (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references profissionais(id) on delete cascade,
  organizacao_id uuid references organizacoes(id) on delete cascade,
  ativo boolean not null default true,
  desde date not null default current_date,
  unique (profissional_id, organizacao_id)
);

-- Equipe sem acesso clínico (gestão e recepção)
create table equipe_org (
  user_id uuid not null references auth.users(id) on delete cascade,
  organizacao_id uuid not null references organizacoes(id) on delete cascade,
  papel text not null check (papel in ('gestor','recepcao')),
  ativo boolean not null default true,
  primary key (user_id, organizacao_id)
);

-- EpisodeOfCare: paciente cadastrado num profissional autônomo ou numa organização
create table carteiras (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id) on delete cascade,
  profissional_id uuid references profissionais(id) on delete cascade,
  organizacao_id uuid references organizacoes(id) on delete cascade,
  desde date not null default current_date,
  check ((profissional_id is null) <> (organizacao_id is null))
);
create unique index carteiras_unica on carteiras (paciente_id, coalesce(profissional_id, organizacao_id));

-- Consent: o paciente libera para um profissional OU uma organização (ou gera um QR ainda não usado)
create table consentimentos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id) on delete cascade,
  profissional_id uuid references profissionais(id) on delete cascade,
  organizacao_id uuid references organizacoes(id) on delete cascade,
  token text unique default encode(gen_random_bytes(18), 'hex'),
  escopo text not null default 'completo' check (escopo in ('completo','emergencia')),
  inicio timestamptz not null default now(),
  fim timestamptz not null,
  revogado_em timestamptz,
  criado_por uuid references auth.users(id),
  criado_em timestamptz not null default now(),
  check (not (profissional_id is not null and organizacao_id is not null)),
  check (fim > inicio)
);
create index on consentimentos (paciente_id) where revogado_em is null;

-- ===================== Registros clínicos =====================

-- DocumentReference
create table documentos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id) on delete cascade,
  tipo text not null check (tipo in ('receita','atestado','pedido_exame','resultado_exame','resumo_alta','outro')),
  titulo text not null,
  arquivo_path text,
  extraido jsonb,
  status text not null default 'confirmado' check (status in ('processando','aguardando_confirmacao','confirmado','descartado')),
  data_documento date,
  enviado_por uuid references auth.users(id),
  criado_em timestamptz not null default now()
);

-- Encounter + Coverage
create table atendimentos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id) on delete cascade,
  organizacao_id uuid references organizacoes(id),
  profissional_id uuid references profissionais(id),
  data timestamptz not null,
  tipo text not null check (tipo in ('consulta','urgencia','retorno','teleconsulta','pre_natal')),
  rede text not null check (rede in ('sus','particular','convenio')),
  operadora text,                    -- nome do convênio, quando rede = convenio
  queixa text,
  hipotese text,
  conduta text,
  origem text not null check (origem in ('paciente_foto','profissional','integracao_fhir','paciente_manual')),
  documento_id uuid references documentos(id) on delete set null,
  registrado_por uuid references auth.users(id),
  criado_em timestamptz not null default now(),
  check (rede <> 'convenio' or operadora is not null)
);
create index on atendimentos (paciente_id, data desc);

-- Provenance: correção de registro profissional (o original nunca muda)
create table adendos (
  id uuid primary key default gen_random_uuid(),
  atendimento_id uuid not null references atendimentos(id) on delete cascade,
  paciente_id uuid not null references pacientes(id) on delete cascade,
  profissional_id uuid not null references profissionais(id),
  texto text not null,
  criado_em timestamptz not null default now()
);

-- Condition
create table condicoes (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id) on delete cascade,
  descricao text not null,
  cid10 text,
  status text not null check (status in ('hipotese','confirmada','resolvida')),
  cronica boolean not null default false,
  inicio date,
  atendimento_id uuid references atendimentos(id) on delete set null,
  origem text not null check (origem in ('paciente_foto','profissional','integracao_fhir','paciente_manual')),
  criado_em timestamptz not null default now()
);

-- MedicationRequest / MedicationStatement
create table medicamentos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id) on delete cascade,
  nome text not null,
  principio_ativo text not null,
  dose text,
  posologia text,
  inicio date,
  fim date,
  ativo boolean not null default true,
  prescritor_id uuid references profissionais(id),
  atendimento_id uuid references atendimentos(id) on delete set null,
  origem text not null check (origem in ('paciente_foto','profissional','integracao_fhir','paciente_manual')),
  criado_em timestamptz not null default now()
);

-- AllergyIntolerance
create table alergias (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id) on delete cascade,
  substancia text not null,
  reacao text,
  gravidade text check (gravidade in ('leve','moderada','grave')),
  registrada_em date,
  origem text not null check (origem in ('paciente_foto','profissional','integracao_fhir','paciente_manual')),
  criado_em timestamptz not null default now()
);

-- ServiceRequest + DiagnosticReport
create table exames (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id) on delete cascade,
  nome text not null,
  pedido_em date,
  resultado_em date,
  resultado text,
  alterado boolean,
  organizacao_id uuid references organizacoes(id),
  atendimento_id uuid references atendimentos(id) on delete set null,
  origem text not null check (origem in ('paciente_foto','profissional','integracao_fhir','paciente_manual')),
  criado_em timestamptz not null default now()
);

-- Appointment: a recepção vê nome e horário (cópia), nunca o dossiê
create table agenda (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid references organizacoes(id) on delete cascade,
  profissional_id uuid not null references profissionais(id) on delete cascade,
  paciente_id uuid references pacientes(id) on delete set null,
  paciente_nome text not null,
  inicio timestamptz not null,
  motivo text,
  status text not null default 'agendado' check (status in ('agendado','confirmado','aguardando','atendido','faltou','cancelado')),
  criado_em timestamptz not null default now()
);
create index on agenda (organizacao_id, inicio);

-- AuditEvent: só inclusão
create table acessos (
  id bigint generated always as identity primary key,
  paciente_id uuid not null references pacientes(id) on delete cascade,
  ator_user_id uuid references auth.users(id),
  ator_nome text not null,
  ator_registro text,
  organizacao_nome text,
  consentimento_id uuid references consentimentos(id) on delete set null,
  acao text not null check (acao in ('visualizou','registrou_atendimento','registrou_adendo','acesso_emergencia','consentiu','revogou')),
  em timestamptz not null default now()
);
create index on acessos (paciente_id, em desc);

-- ===================== Imutabilidade =====================

create or replace function bloquear_alteracao() returns trigger language plpgsql as $$
begin
  raise exception 'registro imutável: %', tg_table_name using errcode = 'insufficient_privilege';
end $$;

create trigger acessos_so_inclusao before update or delete on acessos for each row execute function bloquear_alteracao();
create trigger adendos_so_inclusao before update or delete on adendos for each row execute function bloquear_alteracao();

-- atendimento registrado por profissional não muda (corrige-se com adendo)
create or replace function proteger_atendimento_profissional() returns trigger language plpgsql as $$
begin
  if old.origem = 'profissional' then
    raise exception 'atendimento registrado por profissional não se altera; use um adendo' using errcode = 'insufficient_privilege';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
create trigger atendimento_imutavel before update or delete on atendimentos for each row execute function proteger_atendimento_profissional();

-- ===================== Quem é quem (para as regras) =====================

create or replace function eu_profissional() returns uuid language sql stable security definer set search_path = public as $$
  select id from profissionais where user_id = auth.uid()
$$;

create or replace function e_dono(p uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from vinculos_paciente v where v.paciente_id = p and v.user_id = auth.uid())
$$;

-- profissional logado tem consentimento ativo: direto para ele, ou para uma organização onde ele atua
create or replace function consentimento_ativo(p uuid) returns uuid language sql stable security definer set search_path = public as $$
  select c.id from consentimentos c
  where c.paciente_id = p and c.revogado_em is null and now() between c.inicio and c.fim and c.escopo = 'completo'
    and (c.profissional_id = eu_profissional()
         or c.organizacao_id in (select a.organizacao_id from atuacoes a where a.profissional_id = eu_profissional() and a.ativo))
  order by c.fim desc limit 1
$$;

create or replace function pode_ver_clinico(p uuid) returns boolean language sql stable security definer set search_path = public as $$
  select e_dono(p) or consentimento_ativo(p) is not null
$$;

create or replace function minhas_orgs() returns setof uuid language sql stable security definer set search_path = public as $$
  select organizacao_id from equipe_org where user_id = auth.uid() and ativo
  union
  select organizacao_id from atuacoes where profissional_id = eu_profissional() and ativo and organizacao_id is not null
$$;

-- ===================== RLS =====================

alter table organizacoes enable row level security;
alter table pacientes enable row level security;
alter table vinculos_paciente enable row level security;
alter table profissionais enable row level security;
alter table atuacoes enable row level security;
alter table equipe_org enable row level security;
alter table carteiras enable row level security;
alter table consentimentos enable row level security;
alter table documentos enable row level security;
alter table atendimentos enable row level security;
alter table adendos enable row level security;
alter table condicoes enable row level security;
alter table medicamentos enable row level security;
alter table alergias enable row level security;
alter table exames enable row level security;
alter table agenda enable row level security;
alter table acessos enable row level security;

-- diretório público (nome da unidade e do profissional aparecem nos registros)
create policy org_leitura on organizacoes for select to authenticated using (true);
create policy prof_leitura on profissionais for select to authenticated using (true);
create policy atuacao_leitura on atuacoes for select to authenticated using (true);

create policy vinculo_proprio on vinculos_paciente for select to authenticated using (user_id = auth.uid());
create policy equipe_propria on equipe_org for select to authenticated using (user_id = auth.uid() or organizacao_id in (select minhas_orgs()));

create policy paciente_le on pacientes for select to authenticated using (pode_ver_clinico(id));
create policy paciente_edita on pacientes for update to authenticated using (e_dono(id)) with check (e_dono(id));

create policy carteira_le on carteiras for select to authenticated
  using (e_dono(paciente_id) or profissional_id = eu_profissional() or organizacao_id in (select minhas_orgs()));

-- consentimento: o dono vê e controla; o profissional vê os que são para ele
create policy consent_le on consentimentos for select to authenticated
  using (e_dono(paciente_id) or profissional_id = eu_profissional()
         or organizacao_id in (select organizacao_id from atuacoes where profissional_id = eu_profissional() and ativo));
create policy consent_cria on consentimentos for insert to authenticated with check (e_dono(paciente_id) and criado_por = auth.uid());
create policy consent_revoga on consentimentos for update to authenticated using (e_dono(paciente_id)) with check (e_dono(paciente_id));

-- leitura clínica: dono ou consentimento ativo
do $$ declare t text; begin
  foreach t in array array['documentos','atendimentos','adendos','condicoes','medicamentos','alergias','exames'] loop
    execute format('create policy %1$s_le on %1$s for select to authenticated using (pode_ver_clinico(paciente_id))', t);
  end loop;
end $$;

-- escrita do paciente: só o que ele mesmo traz (foto ou anotação)
create policy doc_paciente on documentos for insert to authenticated with check (e_dono(paciente_id) and enviado_por = auth.uid());
create policy at_paciente on atendimentos for insert to authenticated
  with check (e_dono(paciente_id) and origem in ('paciente_foto','paciente_manual') and registrado_por = auth.uid());
create policy at_paciente_edita on atendimentos for update to authenticated
  using (e_dono(paciente_id) and origem in ('paciente_foto','paciente_manual')) with check (origem in ('paciente_foto','paciente_manual'));
do $$ declare t text; begin
  foreach t in array array['condicoes','medicamentos','alergias','exames'] loop
    execute format('create policy %1$s_paciente on %1$s for insert to authenticated with check (e_dono(paciente_id) and origem in (''paciente_foto'',''paciente_manual''))', t);
    execute format('create policy %1$s_profissional on %1$s for insert to authenticated with check (consentimento_ativo(paciente_id) is not null and origem = ''profissional'')', t);
  end loop;
end $$;

-- escrita do profissional: com consentimento ativo, em nome dele mesmo
create policy at_profissional on atendimentos for insert to authenticated
  with check (consentimento_ativo(paciente_id) is not null and origem = 'profissional' and profissional_id = eu_profissional() and registrado_por = auth.uid());
create policy adendo_profissional on adendos for insert to authenticated
  with check (consentimento_ativo(paciente_id) is not null and profissional_id = eu_profissional());

-- agenda: equipe da organização e o próprio profissional (nome e horário, sem dossiê)
create policy agenda_le on agenda for select to authenticated
  using (organizacao_id in (select minhas_orgs()) or profissional_id = eu_profissional() or e_dono(paciente_id));
create policy agenda_escreve on agenda for insert to authenticated with check (organizacao_id in (select minhas_orgs()) or profissional_id = eu_profissional());
create policy agenda_atualiza on agenda for update to authenticated using (organizacao_id in (select minhas_orgs()) or profissional_id = eu_profissional());

-- auditoria: o dono vê tudo do dossiê; o profissional vê o que ele mesmo fez. Inclusão só por função.
create policy acessos_le on acessos for select to authenticated using (e_dono(paciente_id) or ator_user_id = auth.uid());

-- ===================== Funções da aplicação =====================

-- Abre o dossiê pelo profissional: confere o consentimento e grava o acesso, na mesma transação.
create or replace function abrir_dossie(p uuid) returns boolean language plpgsql security definer set search_path = public as $$
declare c uuid; prof profissionais; org text;
begin
  if e_dono(p) then return true; end if;
  c := consentimento_ativo(p);
  if c is null then return false; end if;
  select * into prof from profissionais where id = eu_profissional();
  select o.nome into org from consentimentos k left join organizacoes o on o.id = k.organizacao_id where k.id = c;
  -- o mesmo profissional abrindo o mesmo dossiê em 30 minutos conta como um acesso só
  if exists (select 1 from acessos where paciente_id = p and ator_user_id = auth.uid() and acao = 'visualizou' and em > now() - interval '30 minutes') then
    return true;
  end if;
  insert into acessos (paciente_id, ator_user_id, ator_nome, ator_registro, organizacao_nome, consentimento_id, acao)
  values (p, auth.uid(), prof.nome, prof.conselho || ' ' || prof.numero || '-' || prof.uf, org, c, 'visualizou');
  return true;
end $$;

-- Paciente revoga: marca e audita.
create or replace function revogar_consentimento(cid uuid) returns void language plpgsql security definer set search_path = public as $$
declare k consentimentos;
begin
  select * into k from consentimentos where id = cid;
  if k.id is null or not e_dono(k.paciente_id) then raise exception 'sem permissão' using errcode = 'insufficient_privilege'; end if;
  update consentimentos set revogado_em = now() where id = cid and revogado_em is null;
  insert into acessos (paciente_id, ator_user_id, ator_nome, acao, consentimento_id) values (k.paciente_id, auth.uid(), 'Paciente', 'revogou', cid);
end $$;

-- Cartão de emergência por token: só alergias, remédios em uso e condições crônicas; sempre auditado.
create or replace function cartao_emergencia(tok text, quem text, justificativa text) returns jsonb language plpgsql security definer set search_path = public as $$
declare k consentimentos; r jsonb;
begin
  if coalesce(length(trim(justificativa)), 0) < 10 then raise exception 'justificativa obrigatória'; end if;
  select * into k from consentimentos where token = tok and escopo = 'emergencia' and revogado_em is null and now() between inicio and fim;
  if k.id is null then return null; end if;
  insert into acessos (paciente_id, ator_nome, acao, consentimento_id, organizacao_nome) values (k.paciente_id, left(quem, 120), 'acesso_emergencia', k.id, left(justificativa, 200));
  select jsonb_build_object(
    'nome', p.nome, 'nascimento', p.nascimento, 'tipo_sanguineo', p.tipo_sanguineo, 'contato', p.contato_emergencia, 'gestante', p.gestante,
    'alergias', coalesce((select jsonb_agg(jsonb_build_object('substancia', a.substancia, 'reacao', a.reacao, 'gravidade', a.gravidade)) from alergias a where a.paciente_id = p.id), '[]'),
    'remedios', coalesce((select jsonb_agg(jsonb_build_object('nome', m.nome, 'posologia', m.posologia)) from medicamentos m where m.paciente_id = p.id and m.ativo and (m.fim is null or m.fim >= current_date)), '[]'),
    'cronicas', coalesce((select jsonb_agg(c.descricao) from condicoes c where c.paciente_id = p.id and c.cronica and c.status <> 'resolvida'), '[]')
  ) into r from pacientes p where p.id = k.paciente_id;
  return r;
end $$;

revoke all on function abrir_dossie(uuid), revogar_consentimento(uuid) from public, anon;
grant execute on function abrir_dossie(uuid), revogar_consentimento(uuid) to authenticated;
revoke all on function cartao_emergencia(text, text, text) from public;
grant execute on function cartao_emergencia(text, text, text) to anon, authenticated;
-- funções auxiliares só para as regras
revoke all on function eu_profissional(), e_dono(uuid), consentimento_ativo(uuid), pode_ver_clinico(uuid), minhas_orgs() from public, anon;
grant execute on function eu_profissional(), e_dono(uuid), consentimento_ativo(uuid), pode_ver_clinico(uuid), minhas_orgs() to authenticated;
