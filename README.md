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
3. **Clínicas e SUS enviam:** modelo de dados inspirado no padrão FHIR (simulado na demo).

Cada registro guarda a **origem** (foto, profissional ou integração). O paciente é dono do dossiê e libera o acesso por QR com prazo; cada acesso fica registrado.

> A IA **apoia** o profissional: resume e alerta. Não faz diagnóstico nem prescreve.

## Demonstração

Na página inicial há contas de demonstração (clínica e pacientes), com **dados 100% fictícios** (pessoas, unidades, registros profissionais e resultados inventados):

- **Lívia, 7 anos** (pela mãe): UBS com hipótese de catapora e, dois dias depois, UPA com hipótese de infecção urinária.
- **José, 78 anos:** três médicos (cardiologista pelo convênio, clínica particular), seis remédios, varfarina.
- **Camila, 29 anos:** gestante de 24 semanas, pré-natal espalhado.

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
- **Teste automático** (`tests/isolamento.mjs`, 83 regras) roda a cada envio: entra com cada conta pela chave pública e confere quem vê o quê, revogação, imutabilidade e emergência.

## IA de apoio (nunca decide)

| Função | Como funciona | Trava |
| --- | --- | --- |
| Ler documento por foto | Foto ou PDF vai para armazenamento privado; Claude Sonnet 5.5 (via OpenRouter) devolve campos em JSON com o trecho do papel | Nada entra no dossiê sem o paciente conferir; não deduz diagnóstico que não está escrito |
| Atendimento por voz | Áudio transcrito no nosso servidor (Whisper, instância só do Elo); Claude Haiku 5.5 organiza queixa, hipótese, conduta, receita e exames | O médico revisa e assina; o banco exige consentimento e audita sozinho (trigger) |
| Resumo em 30 segundos | Claude Haiku 5.5 resume o dossiê que o banco liberou para quem pede | Toda frase cita registros reais; frase sem fonte válida é descartada |
| Alertas | Regras conferidas em código (`lib/alertas.ts`), testadas em `tests/alertas.ts` | A IA só explica; não cria alerta |

Saída sempre em esquema JSON estrito, temperatura 0, chave exclusiva com teto de gasto, usada só no servidor.

## Tecnologia

- Next.js 15 (App Router) + TypeScript
- Supabase (Postgres, Auth, Row Level Security)
- Modelo inspirado em FHIR R4: Patient, RelatedPerson, Practitioner, PractitionerRole, Organization, EpisodeOfCare, Consent, Encounter + Coverage, Condition, MedicationRequest, AllergyIntolerance, ServiceRequest + DiagnosticReport, DocumentReference, Appointment, Provenance (adendos), AuditEvent

Estrutura do banco: [`supabase/migrations`](supabase/migrations). Dados fictícios: [`supabase/seed.sql`](supabase/seed.sql) (aplicados por `scripts/semear.py`).

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha com o seu projeto Supabase
npm run dev
```

## Licença

MIT. Veja [LICENSE](LICENSE).
