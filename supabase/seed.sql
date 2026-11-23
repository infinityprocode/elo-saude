-- Elo Saúde · dados 100% FICTÍCIOS para a demonstração (regra 6.9 do Hack Brasil).
-- Pessoas, unidades, registros profissionais e resultados são inventados.
-- Uso: substitua :marina, :jose, :camila pelos ids das contas de demonstração.

insert into organizacoes (id, nome, tipo, cidade, cnes) values
 ('00000000-0000-4000-8000-0000000000a1','UBS Jardim Norte','ubs','Caraguatatuba','DEMO-0001'),
 ('00000000-0000-4000-8000-0000000000a2','UPA Central','upa','Caraguatatuba','DEMO-0002'),
 ('00000000-0000-4000-8000-0000000000a3','Clínica Cardio Litoral','clinica','São José dos Campos','DEMO-0003'),
 ('00000000-0000-4000-8000-0000000000a4','Consultório Vida Plena','consultorio','Caraguatatuba','DEMO-0004'),
 ('00000000-0000-4000-8000-0000000000a5','Laboratório Análise Norte','laboratorio','Caraguatatuba','DEMO-0005'),
 ('00000000-0000-4000-8000-0000000000a6','Clínica Mulher Bem','clinica','Ubatuba','DEMO-0006');

insert into profissionais (id, nome, registro, especialidade, organizacao_id) values
 ('00000000-0000-4000-8000-0000000000b1','Dra. Helena Martins','DEMO-1001','Medicina de Família','00000000-0000-4000-8000-0000000000a1'),
 ('00000000-0000-4000-8000-0000000000b2','Dr. Ricardo Alves','DEMO-1002','Clínica Médica (urgência)','00000000-0000-4000-8000-0000000000a2'),
 ('00000000-0000-4000-8000-0000000000b3','Dr. Fernando Costa','DEMO-1003','Cardiologia','00000000-0000-4000-8000-0000000000a3'),
 ('00000000-0000-4000-8000-0000000000b4','Dra. Paula Nogueira','DEMO-1004','Ortopedia','00000000-0000-4000-8000-0000000000a4'),
 ('00000000-0000-4000-8000-0000000000b5','Dra. Beatriz Lima','DEMO-1005','Clínica Médica','00000000-0000-4000-8000-0000000000a4'),
 ('00000000-0000-4000-8000-0000000000b6','Dra. Renata Prado','DEMO-1006','Obstetrícia','00000000-0000-4000-8000-0000000000a6');

insert into pacientes (id, nome, nascimento, sexo, peso_kg, tipo_sanguineo, cidade, contato_emergencia, gestante) values
 ('00000000-0000-4000-8000-0000000000c1','Lívia Souza','2019-03-12','F',22,'O+','Caraguatatuba','Marina Souza (mãe) · (12) 90000-0001',false),
 ('00000000-0000-4000-8000-0000000000c2','José Almeida','1948-05-20','M',74,'A+','Caraguatatuba','Rita Almeida (filha) · (12) 90000-0002',false),
 ('00000000-0000-4000-8000-0000000000c3','Camila Rocha','1997-02-08','F',68,'B+','Ubatuba','Bruno Rocha (marido) · (12) 90000-0003',true);

insert into membros (user_id, paciente_id, papel) values
 (:'marina','00000000-0000-4000-8000-0000000000c1','responsavel'),
 (:'jose','00000000-0000-4000-8000-0000000000c2','titular'),
 (:'camila','00000000-0000-4000-8000-0000000000c3','titular');

-- ===== Lívia, 7 anos: UBS (catapora) e, dois dias depois, UPA (infecção urinária) =====
insert into documentos (id, paciente_id, tipo, titulo, data_documento, status, extraido) values
 ('00000000-0000-4000-8000-0000000000d1','00000000-0000-4000-8000-0000000000c1','receita','Receita da UBS Jardim Norte','2026-11-16','confirmado',
  '{"profissional":"Dra. Helena Martins","unidade":"UBS Jardim Norte","itens":["Paracetamol gotas 200 mg/mL","Loção de calamina"]}');

insert into atendimentos (id, paciente_id, organizacao_id, profissional_id, data, tipo, queixa, hipotese, conduta, origem, documento_id) values
 ('00000000-0000-4000-8000-0000000000e1','00000000-0000-4000-8000-0000000000c1','00000000-0000-4000-8000-0000000000a1','00000000-0000-4000-8000-0000000000b1','2026-11-16 09:40-03','consulta',
  'Febre há 2 dias (38,5 °C), bolhas no tronco e coceira.','Varicela (catapora)','Paracetamol se febre, loção de calamina, afastamento da escola por 7 dias. Voltar se piorar.','paciente_foto','00000000-0000-4000-8000-0000000000d1'),
 ('00000000-0000-4000-8000-0000000000e2','00000000-0000-4000-8000-0000000000c1','00000000-0000-4000-8000-0000000000a2','00000000-0000-4000-8000-0000000000b2','2026-11-18 21:15-03','urgencia',
  'Febre persistente, dor e ardência ao urinar.','Infecção urinária','Cefalexina por 7 dias, ibuprofeno se febre. Pedidos: urina tipo 1 e hemograma.','profissional',null);

insert into condicoes (paciente_id, descricao, cid10, status, inicio, atendimento_id, origem) values
 ('00000000-0000-4000-8000-0000000000c1','Varicela (catapora)','B01.9','hipotese','2026-11-16','00000000-0000-4000-8000-0000000000e1','paciente_foto'),
 ('00000000-0000-4000-8000-0000000000c1','Infecção do trato urinário','N39.0','hipotese','2026-11-18','00000000-0000-4000-8000-0000000000e2','profissional');

insert into medicamentos (paciente_id, nome, principio_ativo, dose, posologia, inicio, fim, prescritor_id, atendimento_id, origem) values
 ('00000000-0000-4000-8000-0000000000c1','Paracetamol gotas 200 mg/mL','paracetamol','15 gotas','de 6 em 6 horas, se febre','2026-11-16',null,'00000000-0000-4000-8000-0000000000b1','00000000-0000-4000-8000-0000000000e1','paciente_foto'),
 ('00000000-0000-4000-8000-0000000000c1','Loção de calamina','calamina','uso na pele','nas lesões, 3 vezes ao dia','2026-11-16',null,'00000000-0000-4000-8000-0000000000b1','00000000-0000-4000-8000-0000000000e1','paciente_foto'),
 ('00000000-0000-4000-8000-0000000000c1','Cefalexina suspensão 250 mg/5 mL','cefalexina','5 mL','de 6 em 6 horas por 7 dias','2026-11-18','2026-11-25','00000000-0000-4000-8000-0000000000b2','00000000-0000-4000-8000-0000000000e2','profissional'),
 ('00000000-0000-4000-8000-0000000000c1','Ibuprofeno gotas 50 mg/mL','ibuprofeno','10 gotas','de 8 em 8 horas, se febre','2026-11-18',null,'00000000-0000-4000-8000-0000000000b2','00000000-0000-4000-8000-0000000000e2','profissional');

insert into alergias (paciente_id, substancia, reacao, gravidade, registrada_em, origem) values
 ('00000000-0000-4000-8000-0000000000c1','Dipirona','Placas vermelhas na pele (urticária)','moderada','2025-06-10','profissional');

insert into exames (paciente_id, nome, pedido_em, resultado_em, resultado, alterado, organizacao_id, atendimento_id, origem) values
 ('00000000-0000-4000-8000-0000000000c1','Hemograma','2026-11-16','2026-11-17','Sem alterações relevantes; leucócitos dentro do esperado.',false,'00000000-0000-4000-8000-0000000000a5','00000000-0000-4000-8000-0000000000e1','integracao_fhir'),
 ('00000000-0000-4000-8000-0000000000c1','Urina tipo 1','2026-11-18','2026-11-19','Leucócitos aumentados; nitrito positivo.',true,'00000000-0000-4000-8000-0000000000a5','00000000-0000-4000-8000-0000000000e2','integracao_fhir'),
 ('00000000-0000-4000-8000-0000000000c1','Hemograma','2026-11-18',null,null,null,'00000000-0000-4000-8000-0000000000a5','00000000-0000-4000-8000-0000000000e2','profissional');

-- ===== José, 78 anos: 3 médicos, 6 remédios =====
insert into atendimentos (id, paciente_id, organizacao_id, profissional_id, data, tipo, queixa, hipotese, conduta, origem) values
 ('00000000-0000-4000-8000-0000000000e3','00000000-0000-4000-8000-0000000000c2','00000000-0000-4000-8000-0000000000a3','00000000-0000-4000-8000-0000000000b3','2026-08-12 14:00-03','consulta',
  'Controle da fibrilação atrial.','Fibrilação atrial em acompanhamento','Mantém varfarina; meta de INR entre 2 e 3. Retorno em 3 meses.','integracao_fhir'),
 ('00000000-0000-4000-8000-0000000000e4','00000000-0000-4000-8000-0000000000c2','00000000-0000-4000-8000-0000000000a4','00000000-0000-4000-8000-0000000000b5','2026-09-15 10:30-03','consulta',
  'Consulta de rotina do diabetes.','Diabetes tipo 2 com controle parcial','Mantém metformina; inicia AAS 100 mg e sinvastatina 20 mg.','paciente_foto'),
 ('00000000-0000-4000-8000-0000000000e5','00000000-0000-4000-8000-0000000000c2','00000000-0000-4000-8000-0000000000a4','00000000-0000-4000-8000-0000000000b4','2026-11-20 16:00-03','consulta',
  'Dor no joelho direito há 1 semana.','Artrose do joelho','Diclofenaco 50 mg de 8 em 8 horas por 5 dias; compressa e repouso relativo.','paciente_foto');

insert into condicoes (paciente_id, descricao, cid10, status, cronica, inicio, origem) values
 ('00000000-0000-4000-8000-0000000000c2','Hipertensão arterial','I10','confirmada',true,'2010-04-01','integracao_fhir'),
 ('00000000-0000-4000-8000-0000000000c2','Diabetes tipo 2','E11.9','confirmada',true,'2015-09-01','integracao_fhir'),
 ('00000000-0000-4000-8000-0000000000c2','Fibrilação atrial','I48','confirmada',true,'2023-02-01','integracao_fhir'),
 ('00000000-0000-4000-8000-0000000000c2','Artrose do joelho direito','M17.1','hipotese',false,'2026-11-20','paciente_foto');

insert into medicamentos (paciente_id, nome, principio_ativo, dose, posologia, inicio, fim, prescritor_id, origem) values
 ('00000000-0000-4000-8000-0000000000c2','Losartana 50 mg','losartana','1 comprimido','1 vez ao dia','2010-04-01',null,'00000000-0000-4000-8000-0000000000b5','integracao_fhir'),
 ('00000000-0000-4000-8000-0000000000c2','Metformina 850 mg','metformina','1 comprimido','2 vezes ao dia','2015-09-01',null,'00000000-0000-4000-8000-0000000000b5','integracao_fhir'),
 ('00000000-0000-4000-8000-0000000000c2','Varfarina 5 mg','varfarina','conforme INR','1 vez ao dia','2023-02-01',null,'00000000-0000-4000-8000-0000000000b3','integracao_fhir'),
 ('00000000-0000-4000-8000-0000000000c2','AAS 100 mg','acido acetilsalicilico','1 comprimido','1 vez ao dia, após o almoço','2026-09-15',null,'00000000-0000-4000-8000-0000000000b5','paciente_foto'),
 ('00000000-0000-4000-8000-0000000000c2','Sinvastatina 20 mg','sinvastatina','1 comprimido','à noite','2026-09-15',null,'00000000-0000-4000-8000-0000000000b5','paciente_foto'),
 ('00000000-0000-4000-8000-0000000000c2','Diclofenaco 50 mg','diclofenaco','1 comprimido','de 8 em 8 horas por 5 dias','2026-11-20','2026-11-25','00000000-0000-4000-8000-0000000000b4','paciente_foto');

insert into alergias (paciente_id, substancia, reacao, gravidade, registrada_em, origem) values
 ('00000000-0000-4000-8000-0000000000c2','Penicilina','Falta de ar e inchaço','grave','1990-01-01','integracao_fhir');

insert into exames (paciente_id, nome, pedido_em, resultado_em, resultado, alterado, organizacao_id, origem) values
 ('00000000-0000-4000-8000-0000000000c2','INR','2026-08-12','2026-08-12','2,4 (meta entre 2 e 3)',false,'00000000-0000-4000-8000-0000000000a5','integracao_fhir'),
 ('00000000-0000-4000-8000-0000000000c2','Hemoglobina glicada','2026-09-15','2026-09-18','7,4% (acima da meta de 7%)',true,'00000000-0000-4000-8000-0000000000a5','integracao_fhir'),
 ('00000000-0000-4000-8000-0000000000c2','Creatinina','2026-09-15','2026-09-18','1,1 mg/dL',false,'00000000-0000-4000-8000-0000000000a5','integracao_fhir');

-- ===== Camila, 29 anos, gestante: pré-natal espalhado =====
insert into atendimentos (paciente_id, organizacao_id, profissional_id, data, tipo, queixa, hipotese, conduta, origem) values
 ('00000000-0000-4000-8000-0000000000c3','00000000-0000-4000-8000-0000000000a6','00000000-0000-4000-8000-0000000000b6','2026-07-10 09:00-03','pre_natal','Primeira consulta de pré-natal.','Gestação de 9 semanas','Ácido fólico; exames do primeiro trimestre.','integracao_fhir'),
 ('00000000-0000-4000-8000-0000000000c3','00000000-0000-4000-8000-0000000000a6','00000000-0000-4000-8000-0000000000b6','2026-08-14 09:00-03','pre_natal','Consulta de rotina.','Gestação de 14 semanas, sem intercorrências','Mantém ácido fólico.','integracao_fhir'),
 ('00000000-0000-4000-8000-0000000000c3','00000000-0000-4000-8000-0000000000a6','00000000-0000-4000-8000-0000000000b6','2026-10-09 09:00-03','pre_natal','Cansaço.','Anemia leve da gestação','Inicia sulfato ferroso; repetir hemograma em 30 dias.','paciente_foto');

insert into condicoes (paciente_id, descricao, cid10, status, cronica, inicio, origem) values
 ('00000000-0000-4000-8000-0000000000c3','Gestação (24 semanas)','Z34.9','confirmada',false,'2026-05-29','integracao_fhir'),
 ('00000000-0000-4000-8000-0000000000c3','Anemia leve da gestação','O99.0','hipotese',false,'2026-10-09','paciente_foto');

insert into medicamentos (paciente_id, nome, principio_ativo, dose, posologia, inicio, prescritor_id, origem) values
 ('00000000-0000-4000-8000-0000000000c3','Ácido fólico 5 mg','acido folico','1 comprimido','1 vez ao dia','2026-07-10','00000000-0000-4000-8000-0000000000b6','integracao_fhir'),
 ('00000000-0000-4000-8000-0000000000c3','Sulfato ferroso 40 mg','sulfato ferroso','1 comprimido','1 vez ao dia, longe das refeições','2026-10-09','00000000-0000-4000-8000-0000000000b6','paciente_foto');

insert into exames (paciente_id, nome, pedido_em, resultado_em, resultado, alterado, organizacao_id, origem) values
 ('00000000-0000-4000-8000-0000000000c3','Glicemia de jejum','2026-07-10','2026-07-13','88 mg/dL',false,'00000000-0000-4000-8000-0000000000a5','integracao_fhir'),
 ('00000000-0000-4000-8000-0000000000c3','Sorologias (HIV, sífilis, hepatite B)','2026-07-10','2026-07-14','Não reagentes',false,'00000000-0000-4000-8000-0000000000a5','integracao_fhir'),
 ('00000000-0000-4000-8000-0000000000c3','Hemograma','2026-10-09','2026-10-11','Hemoglobina 10,4 g/dL (baixa)',true,'00000000-0000-4000-8000-0000000000a5','paciente_foto'),
 ('00000000-0000-4000-8000-0000000000c3','Ultrassom morfológico','2026-10-20','2026-10-20','Desenvolvimento adequado para a idade gestacional',false,'00000000-0000-4000-8000-0000000000a6','integracao_fhir');

-- ===== Painel da clínica (fictício) =====
update organizacoes set nome = 'Clínica Vida Plena', tipo = 'clinica' where id = '00000000-0000-4000-8000-0000000000a4';
update profissionais set user_id = :'paula' where id = '00000000-0000-4000-8000-0000000000b4';
-- os três pacientes de demonstração compartilharam o dossiê com a clínica, válido durante a avaliação
insert into compartilhamentos (paciente_id, escopo, expira_em, organizacao_id) values
 ('00000000-0000-4000-8000-0000000000c1','completo','2026-12-31 23:59-03','00000000-0000-4000-8000-0000000000a4'),
 ('00000000-0000-4000-8000-0000000000c2','completo','2026-12-31 23:59-03','00000000-0000-4000-8000-0000000000a4'),
 ('00000000-0000-4000-8000-0000000000c3','completo','2026-12-31 23:59-03','00000000-0000-4000-8000-0000000000a4');
insert into acessos (paciente_id, quem, registro, organizacao, acao, em) values
 ('00000000-0000-4000-8000-0000000000c2','Dra. Paula Nogueira','CRM DEMO-1004','Clínica Vida Plena','registrou_atendimento','2026-11-20 16:20-03'),
 ('00000000-0000-4000-8000-0000000000c1','Dra. Paula Nogueira','CRM DEMO-1004','Clínica Vida Plena','visualizou','2026-11-21 10:05-03'),
 ('00000000-0000-4000-8000-0000000000c3','Dra. Paula Nogueira','CRM DEMO-1004','Clínica Vida Plena','visualizou','2026-11-22 09:12-03');
