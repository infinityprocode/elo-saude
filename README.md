# Elo Saúde

[![Segurança](https://github.com/infinityprocode/elo-saude/actions/workflows/seguranca.yml/badge.svg)](https://github.com/infinityprocode/elo-saude/actions/workflows/seguranca.yml)

**Seu histórico de saúde, completo, onde você for.**

Projeto do **Hack Brasil 2026**, trilha **Saúde & bem-estar**. Demo: https://elosaude.infinityprocode.com.br

## O problema

O histórico de saúde do brasileiro fica espalhado: cada UBS, UPA, clínica e convênio guarda um pedaço, e o próximo médico começa do zero. Uma criança atendida numa UBS com hipótese de catapora e, dois dias depois, numa UPA com hipótese de infecção urinária chega ao segundo médico sem que ele saiba do primeiro diagnóstico, dos sintomas ou do remédio receitado.

## A solução

Um dossiê do paciente que se monta por três caminhos, sem depender da boa vontade de ninguém:

1. **Papéis viram histórico:** foto da receita, atestado ou exame; a IA lê e o paciente confirma.
2. **Médico registra por voz:** pelo QR do paciente, vê o resumo e dita o atendimento.
3. **Clínicas e laboratórios enviam:** entrada em **HL7 FHIR R4**; o paciente é achado pelo HMAC do CPF e o resultado entra no dossiê certo, sem duplicar.

Cada registro guarda a **origem** (foto, profissional ou integração). O paciente é dono do dossiê e libera o acesso por QR com prazo; cada acesso fica registrado.

> A IA **apoia** o profissional: resume e alerta. Não faz diagnóstico nem prescreve.

## Demonstração

Na página inicial há sete contas de demonstração, um clique cada, com **dados 100% fictícios** (pessoas, unidades, registros profissionais, CPFs e resultados inventados; fotos geradas por IA):

| Conta | O que mostrar |
| --- | --- |
| **Dra. Paula**, Clínica Vida Plena | Agenda, alertas antes da consulta, resumo em 30 s com fonte, atendimento por voz, suspender remédio, simular laboratório em FHIR |
| **Dr. Fernando**, consultório próprio | Carteira de pacientes, QR para receber o histórico, consultório sem clínica |
| **Lívia, 7 anos** (pela mãe) | UBS com hipótese de catapora e, dois dias depois, UPA com hipótese de infecção urinária; foto do laudo vira histórico; cartão de emergência |
| **José, 78 anos** | Três médicos, sete remédios, varfarina com AINE de outro médico (alerta) |
| **Camila, 29 anos** | Gestante de 24 semanas, pré-natal espalhado |
| **Juliana**, recepção | Agenda do dia e chegada; não vê nada clínico (o banco não entrega) |
| **Roberto**, gestor | Equipe e operação em números, sem nome de paciente |

Roteiro sugerido (3 minutos): entrar como Dra. Paula, abrir o José, ler os alertas e o resumo, ditar o atendimento suspendendo o diclofenaco, simular o resultado do laboratório (INR 3,8 vira alerta). Depois entrar como a mãe da Lívia e mostrar a linha do tempo, quem abriu o dossiê e o cartão de emergência.

## Cadastro único: três contas que conversam

| Conta | O que faz |
| --- | --- |
| Paciente (e responsável) | Dono do dossiê. Envia documentos, dá e revoga consentimento, vê cada acesso |
| Profissional | Atua em organizações e/ou no consultório próprio. Com consentimento, lê o dossiê e registra atendimentos |
| Organização | Equipe, agenda e carteira de pacientes. Gestão e recepção **não** leem dado clínico |

Cada pessoa tem uma identidade só (CPF ou CNS, guardados **apenas como HMAC**; a chave fica no servidor). Cada registro clínico guarda a origem (foto, profissional ou integração) e a rede (SUS, particular ou convênio).

## Segurança e LGPD (no banco, não só na tela)

- **Regras por linha (RLS)** em todas as tabelas: sem consentimento ativo, o banco não entrega nada, mesmo que o app erre.
- **Consentimento** com escopo, prazo e revogação na hora; abrir um dossiê passa por `abrir_dossie()`, que confere o consentimento e grava o acesso na mesma operação.
- **Auditoria só de inclusão**: `acessos` não aceita alteração nem exclusão (trigger), e o paciente vê tudo.
- **Prontuário imutável**: atendimento registrado por profissional não muda; correção é por adendo.
- **Emergência**: cartão por token com justificativa obrigatória, só alergias, remédios em uso e doenças crônicas, sempre auditado.
- O painel do profissional lê com a **sessão do próprio profissional**; a chave de serviço não é usada nas telas clínicas.
- **Duas etapas (TOTP)** opcional para qualquer conta, exigida **no banco**: quem ativou só lê dado clínico com sessão `aal2` (`eu_profissional()`), mesmo que alguém pule a tela.
- **Aviso de acesso de emergência**: o paciente vê no app quem usou o cartão, quando e o motivo, e pode cancelar o cartão.
- **Recepção e gestão sem dado clínico**: recepção só muda o status da agenda; o gestor vê totais por uma função do banco (`painel_gestor`) que confere o papel.
- **Cabeçalhos**: CSP com nonce por requisição (sem script inline solto), HSTS, `frame-ancestors 'none'`, câmera e microfone só no próprio site.
- **Limites de uso** nas portas abertas: entrar, cartão de emergência, aceitar QR, envio de documento, IA e FHIR.
- **Testes automáticos a cada envio** (GitHub Actions, sem chave de serviço): `tests/isolamento.mjs` entra com cada conta pela chave pública e confere **106 regras** (quem vê o quê, revogação, imutabilidade, emergência, suspensão de remédio, recepção, gestor); `tests/alertas.ts` confere as regras clínicas. No servidor, `tests/duas-etapas.mjs` prova no banco que a etapa extra não é contornável (7/7).

## IA de apoio (nunca decide)

| Função | Como funciona | Trava |
| --- | --- | --- |
| Ler documento por foto | Foto ou PDF vai para armazenamento privado; Claude Sonnet 5.5 (via OpenRouter) devolve campos em JSON com o trecho do papel | Nada entra no dossiê sem o paciente conferir; não deduz diagnóstico que não está escrito |
| Atendimento por voz | Áudio transcrito no nosso servidor (faster-whisper, código em [`servicos/transcricao`](servicos/transcricao/servidor.py)); Claude Haiku 5.5 organiza queixa, hipótese, conduta, receita e exames | O médico revisa e assina; o banco exige consentimento e audita sozinho (trigger) |
| Resumo em 30 segundos | Claude Haiku 5.5 resume o dossiê que o banco liberou para quem pede | Toda frase cita registros reais; frase sem fonte válida é descartada |
| Alertas | Regras conferidas em código (`lib/alertas.ts`), testadas em `tests/alertas.ts` | A IA só explica; não cria alerta |

Saída sempre em esquema JSON estrito, temperatura 0, chave exclusiva com teto de gasto, usada só no servidor.

## Interoperabilidade: HL7 FHIR R4

| Direção | Como | Prova |
| --- | --- | --- |
| **Saída** | `GET /api/fhir/paciente/{id}` (botão "Baixar em HL7 FHIR R4" no dossiê) devolve um `Bundle` com Patient, Encounter, Condition (CID-10), MedicationStatement, AllergyIntolerance, Observation, ServiceRequest, Organization e Practitioner. Lê com a sessão de quem pede: sem consentimento, 404 | **Validador oficial do HL7** (`validator_cli` 7.0.6, FHIR 4.0.1, terminologia em tx.fhir.org): **0 erros e 0 avisos** nos três pacientes. Rode `tests/fhir-validar.sh` |
| **Entrada** | `POST /api/fhir/receber` com token do parceiro. Acha o paciente pelo CPF no OID oficial do Brasil (`2.16.840.1.113883.13.237`), comparando só o HMAC; grava os Observations com origem "integração"; reenvio não duplica; a auditoria mostra quem enviou | Sem token: 401. CPF desconhecido: 404. Mesma mensagem duas vezes: 3 inseridos, depois 0 |

Na demonstração, o botão "Simular resultado do laboratório (FHIR)" no José manda a mesma mensagem que um laboratório mandaria (INR 3,8 com varfarina em uso), e o alerta aparece na hora.

O CPF nunca sai do Elo: o identificador exportado é o do próprio Elo.

## Tecnologia

- Next.js 15 (App Router) + TypeScript
- Supabase (Postgres, Auth, Row Level Security)
- HL7 FHIR R4 (exportação validada e entrada de parceiros); modelo de dados mapeado para Patient, RelatedPerson, Practitioner, PractitionerRole, Organization, EpisodeOfCare, Consent, Encounter + Coverage, Condition, MedicationRequest, AllergyIntolerance, ServiceRequest + DiagnosticReport, DocumentReference, Appointment, Provenance (adendos), AuditEvent

Estrutura do banco: [`supabase/migrations`](supabase/migrations). Dados fictícios: [`supabase/seed.sql`](supabase/seed.sql) (aplicados por `scripts/semear.py`).

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha com o seu projeto Supabase
npm run dev
```

Transcrição do ditado: `pip install faster-whisper numpy` e `ELO_STT_TOKEN=... python3 servicos/transcricao/servidor.py` (precisa de ffmpeg); aponte `ELO_STT_URL` para `http://127.0.0.1:11462`.

Testes: `node tests/isolamento.mjs` (Node 22, contas de demonstração no ambiente) · `npx tsx tests/alertas.ts` · `bash tests/fhir-validar.sh` (Java 17+ e `validator_cli.jar`).

## Licença

MIT. Veja [LICENSE](LICENSE).
