// Indicadores da CLÍNICA FICTÍCIA da demonstração (Clínica Vida Plena).
// Série determinística (mesma semente, mesmos números) para o painel não "mudar sozinho".
// Os alertas, pacientes, documentos e acessos do painel vêm do banco; só estes agregados são simulados.

function semente(n: number) { let x = n; return () => { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296 } }
const SP = 'America/Sao_Paulo'
export const hojeSP = () => new Date(new Date().toLocaleString('en-US', { timeZone: SP }))
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export type Ponto = { data: string; v: number }

export function serieAtendimentos(dias = 30, deslocamento = 0): Ponto[] {
  const r = semente(2026 + deslocamento)
  const fim = hojeSP(); fim.setDate(fim.getDate() - deslocamento)
  const out: Ponto[] = []
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(fim); d.setDate(fim.getDate() - i)
    const dow = d.getDay()
    const base = dow === 0 ? 0 : dow === 6 ? 9 : 19 + (dow === 1 ? 4 : 0)
    const tendencia = (dias - i) * 0.12
    out.push({ data: iso(d), v: dow === 0 ? 0 : Math.round(base + tendencia + r() * 7) })
  }
  return out
}

export function indicadores() {
  const atual = serieAtendimentos(30), anterior = serieAtendimentos(30, 30)
  const soma = (s: Ponto[]) => s.reduce((a, p) => a + p.v, 0)
  const at = soma(atual), ant = soma(anterior)
  const semanal = (vals: number[]) => vals.map((v, i) => ({ data: String(i), v }))
  return {
    serie: atual,
    kpis: [
      { k: 'pacientes', rotulo: 'Pacientes ativos', valor: '1.276', delta: '+5,8%', bom: true, serie: semanal([1148, 1161, 1179, 1192, 1208, 1231, 1249, 1276]), cor: 'cobalt' },
      { k: 'atendimentos', rotulo: 'Atendimentos (30 dias)', valor: at.toLocaleString('pt-BR'), delta: `${at >= ant ? '+' : ''}${(((at - ant) / Math.max(ant, 1)) * 100).toFixed(1).replace('.', ',')}%`, bom: at >= ant, serie: atual.filter((p) => p.v > 0).slice(-12), cor: 'sky' },
      { k: 'dossies', rotulo: 'Chegam com histórico', valor: '78,4%', delta: '+12 pts', bom: true, serie: semanal([61, 63, 64, 68, 70, 73, 76, 78]), cor: 'aqua' },
      { k: 'alertas', rotulo: 'Alertas revistos', valor: '37', delta: '+9', bom: true, serie: semanal([18, 21, 19, 26, 24, 29, 33, 37]), cor: 'warn' },
    ],
  }
}

export type Consulta = { hora: string; nome: string; detalhe: string; profissional: string; status: 'confirmado' | 'aguardando' | 'agendado' | 'atendido'; pacienteId?: string }

export function agendaHoje(): Consulta[] {
  return [
    { hora: '08:30', nome: 'Rosa Antunes', detalhe: 'Retorno · pressão alta', profissional: 'Dra. Beatriz Lima', status: 'atendido' },
    { hora: '10:30', nome: 'Camila Rocha', detalhe: 'Anemia na gestação · resultado de exames', profissional: 'Dra. Beatriz Lima', status: 'confirmado', pacienteId: '00000000-0000-4000-8000-0000000000c3' },
    { hora: '11:15', nome: 'Diego Ferraz', detalhe: 'Primeira consulta · dor lombar', profissional: 'Dra. Paula Nogueira', status: 'aguardando' },
    { hora: '14:00', nome: 'Lívia Souza', detalhe: 'Retorno após UPA · 7 anos', profissional: 'Dra. Beatriz Lima', status: 'confirmado', pacienteId: '00000000-0000-4000-8000-0000000000c1' },
    { hora: '15:30', nome: 'José Almeida', detalhe: 'Retorno · dor no joelho', profissional: 'Dra. Paula Nogueira', status: 'confirmado', pacienteId: '00000000-0000-4000-8000-0000000000c2' },
    { hora: '16:45', nome: 'Helena Prates', detalhe: 'Check-up anual', profissional: 'Dra. Beatriz Lima', status: 'agendado' },
  ]
}
