import s from './page.module.css'
import { Marca } from '@/components/Marca'
import { entrarDemo } from './entrar/actions'

const CONTAS = [
  { conta: 'marina', inicial: 'L', nome: 'Lívia, 7 anos', desc: 'Pela mãe, Marina. Foi à UBS e, dois dias depois, à UPA' },
  { conta: 'jose', inicial: 'J', nome: 'José, 78 anos', desc: '3 médicos, 6 remédios, varfarina' },
  { conta: 'camila', inicial: 'C', nome: 'Camila, 29 anos', desc: 'Gestante de 24 semanas, pré-natal espalhado' },
]

export default async function Inicio({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams
  return (
    <>
      <header className="wrap">
        <div className={s.topo}><Marca /><span className="eyebrow">Hack Brasil 2026</span></div>
      </header>
      <main className="wrap">
        <section className={s.hero}>
          <div>
            <p className="eyebrow">Dossiê de saúde integrado</p>
            <h1>Seu histórico de saúde, <em>completo</em>, onde você for.</h1>
            <p className={s.sub}>O Elo Saúde junta consultas, exames, receitas e remédios de UBS, UPA e clínicas num dossiê só. O próximo médico vê tudo em 30 segundos, e o sistema avisa quando algo não combina.</p>
          </div>
          <div className={`card ${s.demo}`} id="entrar">
            <h2>Entre na demonstração</h2>
            {erro && <p className={s.erro}>Não deu para entrar agora. Tente de novo em alguns segundos.</p>}
            {CONTAS.map((c) => (
              <form key={c.conta} action={entrarDemo}>
                <input type="hidden" name="conta" value={c.conta} />
                <button className={s.conta} type="submit">
                  <span className={s.avatar} aria-hidden="true">{c.inicial}</span>
                  <span><strong>{c.nome}</strong><span>{c.desc}</span></span>
                  <span className={s.seta} aria-hidden="true">→</span>
                </button>
              </form>
            ))}
            <p className="aviso-demo">Todas as pessoas, unidades e registros são fictícios.</p>
          </div>
        </section>
        <section className={s.caminhos} aria-label="Como o dossiê se monta">
          <div className={`card ${s.caminho}`}><span className={s.num}>Caminho 1</span><h3>Papéis viram histórico</h3><p>Foto da receita, do atestado ou do exame. A IA lê, organiza e o paciente confirma.</p></div>
          <div className={`card ${s.caminho}`}><span className={s.num}>Caminho 2</span><h3>Médico registra por voz</h3><p>Pelo QR do paciente, o médico vê o resumo e dita o atendimento em 20 segundos.</p></div>
          <div className={`card ${s.caminho}`}><span className={s.num}>Caminho 3</span><h3>Clínicas e SUS enviam</h3><p>Integração no padrão FHIR, o mesmo da rede nacional de dados do SUS.</p></div>
        </section>
      </main>
      <footer className="wrap">
        <div className={s.rodape}>
          <span>Elo Saúde · projeto do Hack Brasil 2026, trilha Saúde &amp; bem-estar.</span>
          <span>A IA apoia o profissional; não faz diagnóstico nem prescreve.</span>
        </div>
      </footer>
    </>
  )
}
