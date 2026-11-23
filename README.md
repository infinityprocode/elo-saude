# Elo Saúde

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

Na página inicial há três contas de demonstração, com **dados 100% fictícios** (pessoas, unidades, registros profissionais e resultados inventados):

- **Lívia, 7 anos** (pela mãe): UBS com hipótese de catapora e, dois dias depois, UPA com hipótese de infecção urinária.
- **José, 78 anos:** três médicos, seis remédios, varfarina.
- **Camila, 29 anos:** gestante de 24 semanas, pré-natal espalhado.

## Tecnologia

- Next.js 15 (App Router) + TypeScript
- Supabase (Postgres, Auth, Row Level Security por paciente)
- Modelo de dados inspirado em recursos FHIR: Patient, Practitioner, Organization, Encounter, Condition, MedicationStatement, AllergyIntolerance, DiagnosticReport, DocumentReference, Consent, AuditEvent

Estrutura do banco: [`supabase/migrations`](supabase/migrations). Dados fictícios: [`supabase/seed.sql`](supabase/seed.sql).

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha com o seu projeto Supabase
npm run dev
```

## Licença

MIT. Veja [LICENSE](LICENSE).
