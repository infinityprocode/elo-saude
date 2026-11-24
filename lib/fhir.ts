// Elo Saúde · exportação do dossiê em HL7 FHIR R4 (P-ELO-02).
// Um Bundle "collection" com os recursos do paciente, referências internas por urn:uuid.
// Vocabulários oficiais do HL7 para status, verificação, gravidade e interpretação; CID-10 quando existe.
// O CPF/CNS NÃO sai: o banco só guarda o HMAC (o identificador exportado é o do Elo).
// Validado com o validador oficial do HL7 (validator_cli, ver README e tests/fhir-validar.sh).
import { emUso, type Dossie } from './dossie'

const SITE = 'https://elosaude.infinityprocode.com.br/fhir/NamingSystem'
const HL7 = 'http://terminology.hl7.org/CodeSystem'
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const texto = (t: string) => ({ status: 'generated', div: `<div xmlns="http://www.w3.org/1999/xhtml">${esc(t)}</div>` })
const ref = (id: string, display?: string) => (display ? { reference: `urn:uuid:${id}`, display } : { reference: `urn:uuid:${id}` })
const cc = (system: string, code: string, display?: string) => ({ coding: [{ system, code, ...(display ? { display } : {}) }] })
const REDE: Record<string, string> = { sus: 'SUS', particular: 'Particular', convenio: 'Convênio' }

type Recurso = { resourceType: string; id: string; [k: string]: unknown }

export function dossieParaFhir(d: Dossie, agora = new Date()) {
  const p = d.paciente
  const recursos: Recurso[] = []
  const orgs = new Map<string, Recurso>(), profs = new Map<string, Recurso>()

  const org = (o: { id: string; nome: string; cidade?: string | null } | null) => {
    if (!o) return null
    if (!orgs.has(o.id)) orgs.set(o.id, {
      resourceType: 'Organization', id: o.id, text: texto(`${o.nome}${o.cidade ? `, ${o.cidade}` : ''}`), active: true, name: o.nome,
      ...(o.cidade ? { address: [{ city: o.cidade, country: 'BR' }] } : {}),
    })
    return ref(o.id, o.nome)
  }
  const prof = (x: { id: string; nome: string; conselho: string; numero: string; uf: string; especialidade: string | null } | null) => {
    if (!x) return null
    if (!profs.has(x.id)) profs.set(x.id, {
      resourceType: 'Practitioner', id: x.id, text: texto(`${x.nome}, ${x.conselho}-${x.uf} ${x.numero}${x.especialidade ? `, ${x.especialidade}` : ''}`),
      identifier: [{ system: `${SITE}/registro-profissional`, value: `${x.conselho}-${x.uf} ${x.numero}` }],
      active: true, name: [{ text: x.nome }],
      qualification: [{ code: { text: `${x.conselho}${x.especialidade ? `, ${x.especialidade}` : ''}` } }],
    })
    return ref(x.id, x.nome)
  }

  recursos.push({
    resourceType: 'Patient', id: p.id, text: texto(`${p.nome}, nascido(a) em ${p.nascimento}`),
    identifier: [{ system: `${SITE}/paciente`, value: p.id }],
    active: true, name: [{ text: p.nome }],
    gender: p.sexo === 'F' ? 'female' : p.sexo === 'M' ? 'male' : 'unknown',
    birthDate: p.nascimento,
    ...(p.cidade ? { address: [{ city: p.cidade, country: 'BR' }] } : {}),
    ...(p.contato_emergencia ? { contact: [{ name: { text: p.contato_emergencia } }] } : {}),
  })
  const paciente = ref(p.id, p.nome)

  for (const a of d.atendimentos) {
    const serviceProvider = org(a.organizacoes)
    const individuo = prof(a.profissionais)
    const diagnosticos = d.condicoes.filter((c) => c.atendimento_id === a.id).map((c) => ({ condition: ref(c.id) }))
    recursos.push({
      resourceType: 'Encounter', id: a.id,
      text: texto(`${a.tipo} em ${a.data.slice(0, 10)}${a.organizacoes ? `, ${a.organizacoes.nome}` : a.local_texto ? `, ${a.local_texto}` : ''} (${REDE[a.rede] ?? a.rede})`),
      status: 'finished',
      class: { system: `${HL7}/v3-ActCode`, code: /urg|emerg|upa|pronto/i.test(`${a.tipo} ${a.organizacoes?.tipo ?? ''}`) ? 'EMER' : 'AMB' },
      type: [{ text: a.tipo }],
      serviceType: { text: `Rede ${REDE[a.rede] ?? a.rede}${a.operadora ? `, ${a.operadora}` : ''}` },
      subject: paciente,
      ...(individuo ? { participant: [{ individual: individuo }] } : a.profissional_texto ? { participant: [{ individual: { display: a.profissional_texto } }] } : {}),
      period: { start: a.data },
      ...(a.queixa ? { reasonCode: [{ text: a.queixa }] } : {}),
      ...(diagnosticos.length ? { diagnosis: diagnosticos } : {}),
      ...(serviceProvider ? { serviceProvider } : {}),
    })
  }

  for (const c of d.condicoes) {
    recursos.push({
      resourceType: 'Condition', id: c.id, text: texto(`${c.descricao}${c.cid10 ? ` (CID-10 ${c.cid10})` : ''}`),
      clinicalStatus: cc(`${HL7}/condition-clinical`, c.status === 'resolvida' ? 'resolved' : 'active'),
      verificationStatus: cc(`${HL7}/condition-ver-status`, c.status === 'hipotese' ? 'provisional' : 'confirmed'),
      category: [cc(`${HL7}/condition-category`, c.cronica ? 'problem-list-item' : 'encounter-diagnosis')],
      code: { text: c.descricao, ...(c.cid10 ? { coding: [{ system: 'http://hl7.org/fhir/sid/icd-10', code: c.cid10 }] } : {}) },
      subject: paciente,
      ...(c.atendimento_id ? { encounter: ref(c.atendimento_id) } : {}),
      ...(c.inicio ? { onsetDateTime: c.inicio } : {}),
    })
  }

  for (const m of d.medicamentos) {
    const status = !m.ativo ? 'stopped' : emUso(m, agora) ? 'active' : 'completed'
    const fonte = prof(m.profissionais)
    recursos.push({
      resourceType: 'MedicationStatement', id: m.id,
      text: texto(`${m.nome}${m.dose ? `, ${m.dose}` : ''}${m.posologia ? `, ${m.posologia}` : ''} (${status === 'active' ? 'em uso' : status === 'stopped' ? 'suspenso' : 'concluído'})`),
      status,
      medicationCodeableConcept: { text: m.nome },
      subject: paciente,
      ...(m.atendimento_id ? { context: ref(m.atendimento_id) } : {}),
      ...(m.inicio ? { effectivePeriod: { start: m.inicio, ...(m.fim ? { end: m.fim } : {}) } } : {}),
      ...(fonte ? { informationSource: fonte } : {}),
      ...(m.dose || m.posologia ? { dosage: [{ text: [m.dose, m.posologia].filter(Boolean).join(', ') }] } : {}),
    })
  }

  for (const a of d.alergias) {
    const crit = /grave|alta|anafil/i.test(a.gravidade ?? '') ? 'high' : /leve|baixa/i.test(a.gravidade ?? '') ? 'low' : 'unable-to-assess'
    recursos.push({
      resourceType: 'AllergyIntolerance', id: a.id, text: texto(`Alergia a ${a.substancia}${a.reacao ? `: ${a.reacao}` : ''}`),
      clinicalStatus: cc(`${HL7}/allergyintolerance-clinical`, 'active'),
      verificationStatus: cc(`${HL7}/allergyintolerance-verification`, 'confirmed'),
      criticality: crit,
      code: { text: a.substancia },
      patient: paciente,
      ...(a.registrada_em ? { recordedDate: a.registrada_em } : {}),
      ...(a.reacao ? { reaction: [{ manifestation: [{ text: a.reacao }] }] } : {}),
    })
  }

  for (const e of d.exames) {
    const lab = org(e.organizacoes)
    if (e.resultado) {
      recursos.push({
        resourceType: 'Observation', id: e.id, text: texto(`${e.nome}: ${e.resultado}${e.alterado ? ' (fora da referência)' : ''}`),
        status: 'final',
        category: [cc(`${HL7}/observation-category`, 'laboratory', 'Laboratory')],
        code: { text: e.nome },
        subject: paciente,
        ...(e.atendimento_id ? { encounter: ref(e.atendimento_id) } : {}),
        ...(e.resultado_em ? { effectiveDateTime: e.resultado_em } : {}),
        ...(lab ? { performer: [lab] } : {}),
        valueString: e.resultado,
        ...(e.alterado ? { interpretation: [cc(`${HL7}/v3-ObservationInterpretation`, 'A', 'Abnormal')] } : {}),
      })
    } else {
      recursos.push({
        resourceType: 'ServiceRequest', id: e.id, text: texto(`Pedido de ${e.nome}${e.pedido_em ? ` em ${e.pedido_em}` : ''}`),
        status: 'active', intent: 'order',
        code: { text: e.nome },
        subject: paciente,
        ...(e.atendimento_id ? { encounter: ref(e.atendimento_id) } : {}),
        ...(e.pedido_em ? { authoredOn: e.pedido_em } : {}),
      })
    }
  }

  const todos = [...recursos.slice(0, 1), ...orgs.values(), ...profs.values(), ...recursos.slice(1)]
  return {
    resourceType: 'Bundle',
    id: crypto.randomUUID(),
    meta: { lastUpdated: agora.toISOString() },
    identifier: { system: `${SITE}/exportacao`, value: `${p.id}-${agora.getTime()}` },
    type: 'collection',
    timestamp: agora.toISOString(),
    entry: todos.map((r) => ({ fullUrl: `urn:uuid:${r.id}`, resource: r })),
  }
}
