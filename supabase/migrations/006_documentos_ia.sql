-- Elo Saúde · documentos por foto e IA.
-- Arquivos num bucket PRIVADO: pasta = id do paciente. Só o dono envia; lê quem pode ver o dossiê.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos', 'documentos', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists elo_docs_envia on storage.objects;
drop policy if exists elo_docs_le on storage.objects;
create policy elo_docs_envia on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and public.e_dono(((storage.foldername(name))[1])::uuid));
create policy elo_docs_le on storage.objects for select to authenticated
  using (bucket_id = 'documentos' and public.pode_ver_clinico(((storage.foldername(name))[1])::uuid));

-- o paciente confirma ou descarta a leitura da IA (só os documentos dele)
drop policy if exists doc_paciente_confirma on documentos;
create policy doc_paciente_confirma on documentos for update to authenticated
  using (e_dono(paciente_id)) with check (e_dono(paciente_id));

-- profissional com consentimento registra o pedido de exame no atendimento dele
-- (exames/medicamentos/condicoes já têm a política de inserção do profissional na 003)

-- quando o documento cita um lugar ou profissional que não está no cadastro, guarda o texto como foi lido
alter table atendimentos add column if not exists local_texto text;
alter table atendimentos add column if not exists profissional_texto text;

-- todo atendimento registrado por profissional entra na auditoria do paciente, sem depender do app
create or replace function auditar_atendimento() returns trigger language plpgsql security definer set search_path = public as $$
declare prof profissionais;
begin
  if new.origem <> 'profissional' then return new; end if;
  select * into prof from profissionais where id = new.profissional_id;
  insert into acessos (paciente_id, ator_user_id, ator_nome, ator_registro, organizacao_nome, consentimento_id, acao)
  values (new.paciente_id, new.registrado_por, coalesce(prof.nome, 'Profissional'), prof.conselho || ' ' || prof.numero || '-' || prof.uf,
          (select nome from organizacoes where id = new.organizacao_id), consentimento_ativo(new.paciente_id), 'registrou_atendimento');
  return new;
end $$;
drop trigger if exists atendimento_auditado on atendimentos;
create trigger atendimento_auditado after insert on atendimentos for each row execute function auditar_atendimento();
