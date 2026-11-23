-- Elo Saúde · painel da clínica
-- Compartilhamento passa a registrar em qual unidade o dossiê foi aberto.
alter table compartilhamentos add column if not exists organizacao_id uuid references organizacoes(id);
create index if not exists compartilhamentos_org on compartilhamentos (organizacao_id) where revogado_em is null;
