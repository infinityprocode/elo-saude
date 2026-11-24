// Mensagem FHIR R4 FICTÍCIA de um laboratório parceiro (demonstração da entrada por integração, P-ELO-02).
// O CPF 000.000.002-72 é uma sequência de teste (não pertence a ninguém); o Elo compara só o HMAC.
// Ids estáveis: reenviar a mesma mensagem não duplica nada no dossiê.
export function mensagemLaboratorio(ontem: string) {
  const lab = { resourceType: 'Organization', id: 'lab-vale-litoral', text: { status: 'generated', div: '<div xmlns="http://www.w3.org/1999/xhtml">Laboratório Vale Litoral (fictício)</div>' }, active: true, name: 'Laboratório Vale Litoral' }
  const pac = { resourceType: 'Patient', id: 'pac-jose', text: { status: 'generated', div: '<div xmlns="http://www.w3.org/1999/xhtml">José Almeida</div>' }, identifier: [{ system: 'urn:oid:2.16.840.1.113883.13.237', value: '00000000272' }], name: [{ text: 'José Almeida' }], birthDate: '1948-02-10' }
  const obs = (id: string, nome: string, valor: number, unidade: string, ref: string, interp: 'H' | 'N') => ({
    resourceType: 'Observation', id,
    text: { status: 'generated', div: `<div xmlns="http://www.w3.org/1999/xhtml">${nome}: ${String(valor).replace('.', ',')} ${unidade} (referência ${ref})</div>` },
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory', display: 'Laboratory' }] }],
    code: { text: nome },
    subject: { reference: 'urn:uuid:pac-jose' },
    effectiveDateTime: ontem,
    performer: [{ reference: 'urn:uuid:lab-vale-litoral' }],
    valueQuantity: { value: valor, unit: unidade },
    referenceRange: [{ text: ref }],
    interpretation: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation', code: interp, display: interp === 'H' ? 'High' : 'Normal' }] }],
  })
  const recursos = [lab, pac,
    obs('vl-inr', 'INR (tempo de protrombina)', 3.8, '{INR}', '2,0 a 3,0', 'H'),
    obs('vl-hba1c', 'Hemoglobina glicada (HbA1c)', 7.1, '%', 'até 5,6', 'H'),
    obs('vl-creat', 'Creatinina', 1.1, 'mg/dL', '0,7 a 1,3', 'N')]
  return { resourceType: 'Bundle', id: 'msg-vale-litoral', type: 'collection', timestamp: `${ontem}T18:00:00-03:00`, entry: recursos.map((r) => ({ fullUrl: `urn:uuid:${r.id}`, resource: r })) }
}
