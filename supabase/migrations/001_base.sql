-- Elo Saúde · base do dossiê (Hack Brasil 2026)
-- Modelo inspirado nos recursos FHIR: Patient, Practitioner, Organization, Encounter,
-- Condition, MedicationStatement, AllergyIntolerance, ServiceRequest/DiagnosticReport, DocumentReference, Consent, AuditEvent.
-- Toda linha clínica guarda a ORIGEM (foto do paciente, profissional, integração) e o vínculo com o atendimento.

create extension if not exists pgcrypto;

create table organizacoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null check (tipo in ('ubs','upa','clinica','hospital','laboratorio','consultorio')),
  cidade text not null,
  uf text not null default 'SP',
  cnes text,                     -- fictício na demo
  criado_em timestamptz not null default now()
);

create table profissionais (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  conselho text not null default 'CRM',
  registro text not null,        -- fictício na demo
  especialidade text,
  organizacao_id uuid references organizacoes(id),
  user_id uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now()
);

create table pacientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  nascimento date not null,
  sexo text check (sexo in ('F','M','O')),
  peso_kg numeric(5,1),
  tipo_sanguineo text,
  cidade text,
  uf text default 'SP',
  contato_emergencia text,
  gestante boolean not null default false,
  criado_em timestamptz not null default now()
);

-- quem gerencia o dossiê: o próprio titular ou o responsável (pais, cuidadores)
create table membros (
  user_id uuid not null references auth.users(id) on delete cascade,
  paciente_id uuid not null references pacientes(id) on delete cascade,
  papel text not null check (papel in ('titular','responsavel')),
  primary key (user_id, paciente_id)
);

create table documentos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id) on delete cascade,
  tipo text not null check (tipo in ('receita','atestado','pedido_exame','resultado_exame','resumo_alta','outro')),
  titulo text not null,
  arquivo_path text,
  extraido jsonb,                -- o que a IA leu
  status text not null default 'confirmado' check (status in ('processando','aguardando_confirmacao','confirmado','descartado')),
  data_documento date,
  criado_em timestamptz not null default now()
);

create table atendimentos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id) on delete cascade,
  organizacao_id uuid references organizacoes(id),
  profissional_id uuid references profissionais(id),
  data timestamptz not null,
  tipo text not null check (tipo in ('consulta','urgencia','retorno','teleconsulta','pre_natal')),
  queixa text,
  hipotese text,
  conduta text,
  origem text not null check (origem in ('paciente_foto','profissional','integracao_fhir','paciente_manual')),
  documento_id uuid references documentos(id) on delete set null,
  criado_em timestamptz not null default now()
);

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

-- consentimento: QR/link com prazo e escopo, revogável
create table compartilhamentos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(18), 'hex'),
  escopo text not null default 'completo' check (escopo in ('completo','emergencia')),
  expira_em timestamptz not null,
  revogado_em timestamptz,
  criado_por uuid references auth.users(id),
  criado_em timestamptz not null default now()
);

-- auditoria: cada acesso e cada registro feito por terceiros
create table acessos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id) on delete cascade,
  compartilhamento_id uuid references compartilhamentos(id) on delete set null,
  quem text not null,
  registro text,
  organizacao text,
  acao text not null check (acao in ('visualizou','registrou_atendimento','acesso_emergencia')),
  em timestamptz not null default now()
);

create index on atendimentos (paciente_id, data desc);
create index on condicoes (paciente_id);
create index on medicamentos (paciente_id);
create index on exames (paciente_id);
create index on documentos (paciente_id);
create index on acessos (paciente_id, em desc);

-- RLS: o paciente (ou responsável) só vê o próprio dossiê. Profissional entra por token, no servidor.
create or replace function public.e_membro(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from membros m where m.paciente_id = p and m.user_id = auth.uid())
$$;

alter table organizacoes enable row level security;
alter table profissionais enable row level security;
alter table pacientes enable row level security;
alter table membros enable row level security;
alter table documentos enable row level security;
alter table atendimentos enable row level security;
alter table condicoes enable row level security;
alter table medicamentos enable row level security;
alter table alergias enable row level security;
alter table exames enable row level security;
alter table compartilhamentos enable row level security;
alter table acessos enable row level security;

create policy org_leitura on organizacoes for select to authenticated using (true);
create policy prof_leitura on profissionais for select to authenticated using (true);
create policy membros_proprios on membros for select to authenticated using (user_id = auth.uid());
create policy pac_le on pacientes for select to authenticated using (e_membro(id));
create policy pac_edita on pacientes for update to authenticated using (e_membro(id)) with check (e_membro(id));

do $$ declare t text; begin
  foreach t in array array['documentos','atendimentos','condicoes','medicamentos','alergias','exames','compartilhamentos'] loop
    execute format('create policy %1$s_le on %1$s for select to authenticated using (e_membro(paciente_id))', t);
    execute format('create policy %1$s_insere on %1$s for insert to authenticated with check (e_membro(paciente_id))', t);
    execute format('create policy %1$s_altera on %1$s for update to authenticated using (e_membro(paciente_id)) with check (e_membro(paciente_id))', t);
  end loop;
end $$;
create policy acessos_le on acessos for select to authenticated using (e_membro(paciente_id));
-- registros feitos por profissional não podem ser apagados pelo paciente: nenhuma policy de delete.
