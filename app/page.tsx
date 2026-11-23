import { ArrowRight, Building2, FileScan, Mic, Network, ShieldCheck, Stethoscope, TriangleAlert } from 'lucide-react'
import { Marca } from '@/components/Marca'
import { HeroElo } from '@/components/clinica/HeroElo'
import { entrarDemo } from './entrar/actions'
import s from './page.module.css'

const PACIENTES = [
  { conta: 'marina', ini: 'LS', nome: 'Lívia, 7 anos', desc: 'Pela mãe, Marina. UBS na segunda, UPA na quarta, dois diagnósticos.' },
  { conta: 'jose', ini: 'JA', nome: 'José, 78 anos', desc: 'Três médicos, seis remédios, varfarina.' },
  { conta: 'camila', ini: 'CR', nome: 'Camila, 29 anos', desc: 'Gestante de 24 semanas, pré-natal espalhado.' },
]

function Entrar({ conta, className, children }: { conta: string; className?: string; children: React.ReactNode }) {
  return <form action={entrarDemo}><input type="hidden" name="conta" value={conta} /><button type="submit" className={className}>{children}</button></form>
}

export default async function Inicio({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams
  return (
    <>
      <div className="atmosfera" aria-hidden="true" />
      <header className={s.topo}>
        <Marca />
        <nav className={s.nav} aria-label="Seções"><a href="#problema">O problema</a><a href="#como">Como funciona</a><a href="#entrar">Demonstração</a></nav>
        <a href="#entrar" className="btn btn-primario">Entrar</a>
      </header>

      <main className={s.principal}>
        <section className={s.hero}>
          <div className={`${s.heroTxt} entra`}>
            <span className={s.selo}><span className={s.vivo} aria-hidden="true" />Hack Brasil 2026 · Saúde &amp; bem-estar</span>
            <h1>Seu histórico de saúde, completo, <span className={s.grad}>onde você for.</span></h1>
            <p>O Elo Saúde junta consultas, exames, receitas e remédios de UBS, UPA e clínicas num dossiê só. O próximo médico vê tudo em 30 segundos, e o sistema avisa quando algo não combina.</p>
            <div className={s.ctas}>
              <Entrar conta="paula" className="btn btn-primario">Ver o painel da clínica <ArrowRight size={18} aria-hidden="true" /></Entrar>
              <a href="#entrar" className="btn btn-suave">Ver como paciente</a>
            </div>
            {erro && <p className={s.erro}>Não deu para entrar agora. Tente de novo em alguns segundos.</p>}
          </div>

          <div className={`${s.palco} entra`} style={{ ['--i' as string]: 2 }} aria-hidden="true">
            <div className={s.palcoArte}><HeroElo /></div>
            <div className={`${s.flutua} ${s.fAlerta}`}>
              <span className={s.fIco}><TriangleAlert size={16} /></span>
              <div><strong>Hipóteses diferentes em 2 dias</strong><span>UBS: catapora · UPA: infecção urinária. Vale reavaliar.</span></div>
            </div>
            <div className={`${s.flutua} ${s.fRemedio}`}>
              <span className={s.fIco2}><ShieldCheck size={16} /></span>
              <div><strong>Ibuprofeno com catapora</strong><span>Receitado na UPA; catapora registrada na UBS.</span></div>
            </div>
            <div className={`${s.flutua} ${s.fOrigem}`}>
              <span className="pill or-foto">Lido de foto da receita</span>
              <span className="pill or-fhir">Recebido da unidade (FHIR)</span>
              <span className="pill or-prof">Registrado pelo profissional</span>
            </div>
          </div>
        </section>

        <section className={s.problema} id="problema" aria-labelledby="t-prob">
          <span className="eyebrow">O problema</span>
          <h2 id="t-prob">O segundo médico nunca soube do primeiro.</h2>
          <div className={s.historia}>
            <article className={`card ${s.h1c}`}><span className="mono">Segunda · 09:40</span><strong>UBS de bairro</strong><p>Febre e bolhas no corpo. Hipótese: catapora. Paracetamol e loção.</p></article>
            <span className={s.seta} aria-hidden="true"><ArrowRight size={22} /></span>
            <article className={`card ${s.h2c}`}><span className="mono">Quarta · 21:15</span><strong>UPA do centro</strong><p>Febre e ardência ao urinar. Hipótese: infecção urinária. Antibiótico e ibuprofeno.</p></article>
          </div>
          <p className={s.probTxt}>Cada UBS, UPA e clínica guarda um pedaço da história. Sem o histórico, ninguém confirma o primeiro diagnóstico, ninguém nota o exame repetido e ninguém vê que o ibuprofeno é desaconselhado na catapora.</p>
        </section>

        <section className={s.como} id="como" aria-labelledby="t-como">
          <span className="eyebrow">Como funciona</span>
          <h2 id="t-como">O dossiê se monta sozinho, por três caminhos.</h2>
          <div className={s.bento}>
            <article className={`card ${s.b1}`}>
              <div className={s.ocr} aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/exemplos/receita.png" alt="" width={820} height={1120} loading="lazy" />
                <span className={s.ocrSeta}><ArrowRight size={18} /></span>
                <ul><li><small>Remédio</small>Cefalexina 250 mg/5 mL</li><li><small>Como usar</small>5 mL de 6 em 6 horas</li><li><small>Observação</small>Suspender ibuprofeno</li></ul>
              </div>
              <FileScan size={26} aria-hidden="true" /><h3>Papéis viram histórico</h3><p>O paciente fotografa a receita, o atestado ou o exame. A IA lê, organiza e ele confirma antes de salvar.</p>
            </article>
            <article className={`card ${s.b2}`}><Mic size={26} aria-hidden="true" /><h3>O médico registra por voz</h3><p>Pelo QR do paciente, vê o resumo e dita o atendimento em 20 segundos.</p></article>
            <article className={`card ${s.b3}`}><Network size={26} aria-hidden="true" /><h3>Clínicas e SUS enviam</h3><p>Integração no padrão FHIR, o mesmo da rede nacional de dados do SUS.</p></article>
            <article className={`card ${s.b4}`}><ShieldCheck size={26} aria-hidden="true" /><h3>O dossiê é do paciente</h3><p>Ele libera por QR com prazo, revoga quando quiser e vê cada acesso. Dado de saúde é sensível na LGPD, e o Elo trata assim.</p></article>
          </div>
        </section>

        <section className={s.demo} id="entrar" aria-labelledby="t-demo">
          <span className="eyebrow">Demonstração</span>
          <h2 id="t-demo">Entre e veja funcionando.</h2>
          <div className={s.contas}>
            <Entrar conta="paula" className={`${s.conta} ${s.contaClinica}`}>
              <span className={s.cIco} aria-hidden="true"><Building2 size={22} /></span>
              <span className={s.cTxt}><strong>Clínica Vida Plena</strong><span>Painel da Dra. Paula: agenda, alertas antes da consulta e assistente.</span></span>
              <span className={s.cIr} aria-hidden="true"><ArrowRight size={20} /></span>
            </Entrar>
            {PACIENTES.map((p) => (
              <Entrar key={p.conta} conta={p.conta} className={s.conta}>
                <span className={s.cAv} aria-hidden="true">{p.ini}</span>
                <span className={s.cTxt}><strong>{p.nome}</strong><span>{p.desc}</span></span>
                <span className={s.cIr} aria-hidden="true"><ArrowRight size={20} /></span>
              </Entrar>
            ))}
          </div>
          <p className="aviso-demo"><Stethoscope size={15} aria-hidden="true" />Pessoas, unidades e registros são fictícios.</p>
        </section>
      </main>

      <footer className={s.rodape}>
        <Marca tamanho={28} />
        <p>Projeto do Hack Brasil 2026, trilha Saúde &amp; bem-estar. A IA apoia o profissional: resume e alerta, não faz diagnóstico nem prescreve.</p>
      </footer>
    </>
  )
}
