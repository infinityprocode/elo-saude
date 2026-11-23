import Link from 'next/link'
import { ArrowRight, BadgeCheck, Building2, Code2, FileScan, Fingerprint, HeartHandshake, Lock, Mic, Network, ScrollText, ShieldCheck, Sparkles, Stethoscope, TriangleAlert, UserRound } from 'lucide-react'
import { Marca } from '@/components/Marca'
import { Jornada } from '@/components/clinica/Jornada'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { carregarDossie } from '@/lib/dossie'
import { calcularAlertas } from '@/lib/alertas'
import { retrato } from '@/lib/retratos'
import { entrarDemo } from './entrar/actions'
import m from '@/components/shell/Moldura.module.css'
import s from './page.module.css'

export const revalidate = 300

const LIVIA = '00000000-0000-4000-8000-0000000000c1'

function Entrar({ conta, className, children }: { conta: string; className?: string; children: React.ReactNode }) {
  return <form action={entrarDemo} className={s.form}><input type="hidden" name="conta" value={conta} /><button type="submit" className={className}>{children}</button></form>
}

function Foto({ nome, ini }: { nome: string; ini: string }) {
  const f = retrato(nome)
  return f ? <img src={f} alt="" width={56} height={56} className={s.foto} loading="lazy" /> : <span className={s.fotoIni} aria-hidden="true">{ini}</span>
}

export default async function Inicio({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams
  // Jornada real da paciente fictícia da demonstração (dados de exemplo, sem pessoa real)
  const livia = await carregarDossie(supabaseAdmin(), LIVIA)
  const alertasLivia = livia ? calcularAlertas(livia) : []

  return (
    <div className={m.pagina}>
      <div className={m.moldura}>
        <div className={m.faixa}>
          <header className={m.barra}>
            <Link href="/" className={m.logo} aria-label="Elo Saúde, início"><Marca tamanho={40} /></Link>
            <nav className={m.pilula} aria-label="Seções">
              <a href="#jornada" className={m.on}>O Elo</a>
              <a href="#problema">O problema</a>
              <a href="#contas">Para quem</a>
              <a href="#seguranca">Segurança</a>
            </nav>
            <div className={m.acoes}>
              <a href="#entrar" className={m.perguntar}><Sparkles size={16} aria-hidden="true" />Ver a demonstração</a>
              <a href="#entrar" className={`${s.entrarMobile} btn btn-primario`}>Entrar</a>
            </div>
          </header>
          <div className={`${m.conteudoFaixa} ${s.faixaHero}`}>
            <div className={s.hero}>
              <span className={s.selo}><span className={s.vivo} aria-hidden="true" />Hack Brasil 2026 · Saúde &amp; bem-estar</span>
              <h1><span>Uma pessoa,</span> <span>um histórico.</span> <span className={s.grad}>Em qualquer lugar.</span></h1>
              <p>O cadastro único que liga paciente, médicos e clínicas. Consultas, exames e remédios do SUS, do particular e do convênio chegam juntos ao próximo atendimento, e o sistema avisa quando algo não combina.</p>
              <div className={s.ctas}>
                <Entrar conta="paula" className="btn btn-primario">Ver o painel da clínica <ArrowRight size={18} aria-hidden="true" /></Entrar>
                <a href="#entrar" className={`btn ${s.btnVidro}`}>Entrar como paciente</a>
              </div>
              <ul className={s.garantias}>
                <li><BadgeCheck size={16} aria-hidden="true" />Padrão FHIR R4</li>
                <li><Lock size={16} aria-hidden="true" />LGPD desde o desenho</li>
                <li><Code2 size={16} aria-hidden="true" />Código aberto</li>
                <li><ShieldCheck size={16} aria-hidden="true" />IA que não diagnostica</li>
              </ul>
              {erro && <p className={s.erro}>Não deu para entrar agora. Tente de novo em alguns segundos.</p>}
            </div>

            <div className={s.palco} aria-hidden="true">
              <img src="/arte/hero-elo-768.webp" srcSet="/arte/hero-elo-768.webp 768w, /arte/hero-elo.webp 1536w" sizes="(min-width: 1024px) 720px, 90vw" alt="" className={s.arte3d} width={1536} height={768} />
              <div className={s.janela}>
                <div className={s.janelaBarra}><i /><i /><i /><span>elosaude.infinityprocode.com.br/clinica</span></div>
                <img src="/arte/painel-1x.webp" srcSet="/arte/painel-1x.webp 1316w, /arte/painel.webp 2632w" sizes="(min-width: 1024px) 760px, 92vw" alt="" width={1316} height={759} />
              </div>
              {alertasLivia[0] && (
                <div className={`${s.flut} ${s.flutAlerta}`}>
                  <span className={s.vidroAl}><TriangleAlert size={16} /></span>
                  <span className={s.vidroTxt}><small>Hoje 14:00 · Lívia, 7 anos</small><strong>{alertasLivia[0].titulo}</strong></span>
                </div>
              )}
              <div className={`${s.flut} ${s.flutRede}`}>
                <small>Mesmo dossiê, três redes</small>
                <span><b className={s.sus}>SUS</b><b className={s.part}>Particular</b><b className={s.conv}>Convênio</b></span>
              </div>
            </div>
          </div>
          <div className={m.abas}>
            <a href="#contas" className={`${m.aba} ${m.abaOn}`}><span className={m.abaIco}><UserRound size={20} aria-hidden="true" /></span><span className={m.abaTxt}><strong>Paciente</strong><small>dono do histórico</small></span></a>
            <a href="#contas" className={m.aba}><span className={m.abaIco}><Stethoscope size={20} aria-hidden="true" /></span><span className={m.abaTxt}><strong>Médico autônomo</strong><small>carteira e atendimento</small></span></a>
            <a href="#contas" className={m.aba}><span className={m.abaIco}><Building2 size={20} aria-hidden="true" /></span><span className={m.abaTxt}><strong>Clínica</strong><small>equipe, agenda e pacientes</small></span></a>
            <a href="#seguranca" className={m.aba}><span className={m.abaIco}><Network size={20} aria-hidden="true" /></span><span className={m.abaTxt}><strong>SUS, particular e convênio</strong><small>tudo no mesmo cadastro</small></span></a>
          </div>
        </div>

        <main className={m.painel}>
          <div className={s.secoes}>
            <section className={s.jornadaSec} id="jornada" aria-label="Exemplo de jornada">
              <div className={s.secTit}>
                <span className={s.eyebrow}>O Elo em uma imagem</span>
                <h2>O caminho do paciente, de ponta a ponta.</h2>
                <p>Exemplo da demonstração: cada parada mostra onde a Lívia foi atendida, por qual rede, e o ponto em que o sistema percebeu que algo não combinava.</p>
              </div>
              {livia && <Jornada d={livia} alertas={alertasLivia} hora="14:00" clinica="Clínica Vida Plena" href="#entrar" />}
            </section>

            <section className={s.problema} id="problema" aria-labelledby="t-prob">
              <div className={s.secTit}>
                <span className={s.eyebrow}>O problema</span>
                <h2 id="t-prob">O segundo médico nunca soube do primeiro.</h2>
              </div>
              <div className={s.historia}>
                <article className={`card ${s.passo}`}><span className={s.dia}>Segunda · 09:40</span><strong>UBS de bairro</strong><p>Febre e bolhas no corpo. Hipótese: catapora. Paracetamol e loção.</p><span className={`${s.rede} ${s.sus}`}>SUS</span></article>
                <span className={s.seta} aria-hidden="true"><ArrowRight size={20} /></span>
                <article className={`card ${s.passo}`}><span className={s.dia}>Quarta · 21:15</span><strong>UPA do centro</strong><p>Febre e ardência ao urinar. Hipótese: infecção urinária. Antibiótico e ibuprofeno.</p><span className={`${s.rede} ${s.sus}`}>SUS</span></article>
                <span className={s.seta} aria-hidden="true"><ArrowRight size={20} /></span>
                <article className={`card ${s.passo} ${s.passoAlerta}`}><span className={s.dia}>Com o Elo</span><strong>O próximo médico vê tudo</strong><p>Hipóteses diferentes em 2 dias, e ibuprofeno desaconselhado na catapora. Em 30 segundos, antes de chamar o paciente.</p><span className={s.alertaTag}><TriangleAlert size={13} aria-hidden="true" />2 alertas</span></article>
              </div>
              <p className={s.probTxt}>Cada UBS, UPA, consultório e clínica guarda um pedaço da história, e o brasileiro passa por todos eles. Sem o histórico, ninguém confirma o primeiro diagnóstico, ninguém nota o exame repetido e ninguém vê o remédio que não combina.</p>
            </section>

            <section className={s.contas} id="contas" aria-labelledby="t-contas">
              <div className={s.secTit}>
                <span className={s.eyebrow}>Para quem</span>
                <h2 id="t-contas">Três contas, um cadastro único.</h2>
              </div>
              <div className={s.contasGrade}>
                <article className={`card ${s.conta}`}><span className={s.contaIco}><HeartHandshake size={22} aria-hidden="true" /></span><h3>Paciente e família</h3><p>O histórico inteiro na mão, de todos os lugares. Fotografa a receita e o Elo organiza. Libera o acesso por QR com prazo, revoga quando quiser e vê quem abriu.</p></article>
                <article className={`card ${s.conta}`}><span className={s.contaIco}><Stethoscope size={22} aria-hidden="true" /></span><h3>Médico autônomo</h3><p>Carteira de pacientes e agenda do consultório. Recebe o histórico resumido antes da consulta e registra o atendimento por voz, em segundos.</p></article>
                <article className={`card ${s.conta} ${s.contaDestaque}`}><span className={s.contaIco}><Building2 size={22} aria-hidden="true" /></span><h3>Clínica</h3><p>Equipe, agenda de vários profissionais e pacientes num painel. A recepção agenda sem ver dado clínico; o médico vê o que o paciente liberou.</p></article>
              </div>
            </section>

            <section className={s.como} aria-labelledby="t-como">
              <div className={s.secTit}>
                <span className={s.eyebrow}>Como funciona</span>
                <h2 id="t-como">O dossiê se monta sozinho, por três caminhos.</h2>
              </div>
              <div className={s.caminhos}>
                <article className={`card ${s.cam} ${s.camFoto}`}>
                  <div className={s.ocr} aria-hidden="true">
                    <img src="/exemplos/receita.png" alt="" width={820} height={1120} loading="lazy" />
                    <span className={s.ocrSeta}><ArrowRight size={18} /></span>
                    <ul><li><small>Remédio</small>Cefalexina 250 mg/5 mL</li><li><small>Como usar</small>5 mL de 6 em 6 horas</li><li><small>Observação</small>Suspender ibuprofeno</li></ul>
                  </div>
                  <h3><FileScan size={20} aria-hidden="true" />Papéis viram histórico</h3><p>Foto da receita, do atestado ou do exame. A IA lê, organiza e o paciente confirma antes de salvar.</p>
                </article>
                <article className={`card ${s.cam}`}><h3><Mic size={20} aria-hidden="true" />O médico registra por voz</h3><p>Pelo QR do paciente, vê o resumo e dita o atendimento. A IA estrutura queixa, hipótese e conduta, e ele confirma.</p></article>
                <article className={`card ${s.cam}`}><h3><Network size={20} aria-hidden="true" />Clínicas e SUS enviam</h3><p>No padrão FHIR, o mesmo da rede nacional de dados do SUS. Laboratórios e unidades entregam direto no dossiê certo.</p></article>
              </div>
            </section>

            <section className={s.seg} id="seguranca" aria-labelledby="t-seg">
              <div className={s.secTit}>
                <span className={s.eyebrow}>Segurança e LGPD</span>
                <h2 id="t-seg">Dado de saúde é sensível. O Elo trata assim.</h2>
              </div>
              <ul className={s.segLista}>
                <li><Fingerprint size={20} aria-hidden="true" /><strong>O paciente decide</strong><span>Acesso por QR com prazo e escopo, revogável na hora.</span></li>
                <li><ScrollText size={20} aria-hidden="true" /><strong>Cada acesso fica gravado</strong><span>O paciente vê quem abriu, quando e o que registrou.</span></li>
                <li><Lock size={20} aria-hidden="true" /><strong>Regra no banco, não só na tela</strong><span>Cada linha só aparece para quem tem consentimento.</span></li>
                <li><ShieldCheck size={20} aria-hidden="true" /><strong>A IA apoia, não decide</strong><span>Alertas por regras conferidas; nada entra sem confirmação.</span></li>
              </ul>
            </section>

            <section className={s.demo} id="entrar" aria-labelledby="t-demo">
              <div className={s.secTit}>
                <span className={s.eyebrow}>Demonstração</span>
                <h2 id="t-demo">Entre e veja funcionando.</h2>
              </div>
              <div className={s.demoGrade}>
                <Entrar conta="paula" className={`${s.cartao} ${s.cartaoClinica}`}>
                  <Foto nome="Dra. Paula Nogueira" ini="PN" />
                  <span className={s.cTxt}><small>Visão da clínica</small><strong>Dra. Paula, Clínica Vida Plena</strong><span>Agenda, jornada do paciente, alertas antes da consulta e assistente.</span></span>
                  <ArrowRight size={22} aria-hidden="true" className={s.cIr} />
                </Entrar>
                <Entrar conta="marina" className={s.cartao}>
                  <Foto nome="Marina Souza" ini="MS" />
                  <span className={s.cTxt}><small>Paciente, pela mãe</small><strong>Lívia, 7 anos</strong><span>UBS na segunda, UPA na quarta, dois diagnósticos.</span></span>
                  <ArrowRight size={20} aria-hidden="true" className={s.cIr} />
                </Entrar>
                <Entrar conta="jose" className={s.cartao}>
                  <Foto nome="José Almeida" ini="JA" />
                  <span className={s.cTxt}><small>Paciente</small><strong>José, 78 anos</strong><span>Três médicos, seis remédios, varfarina.</span></span>
                  <ArrowRight size={20} aria-hidden="true" className={s.cIr} />
                </Entrar>
                <Entrar conta="camila" className={s.cartao}>
                  <Foto nome="Camila Rocha" ini="CR" />
                  <span className={s.cTxt}><small>Paciente</small><strong>Camila, 29 anos</strong><span>Gestante de 24 semanas, pré-natal espalhado.</span></span>
                  <ArrowRight size={20} aria-hidden="true" className={s.cIr} />
                </Entrar>
              </div>
              <p className={s.aviso}>Pessoas, unidades, registros e fotos são fictícios. As fotos foram geradas por IA e não mostram pessoas reais.</p>
            </section>

            <footer className={s.rodape}>
              <span className={s.rodMarca}><Marca tamanho={32} /></span>
              <p>Projeto do Hack Brasil 2026, trilha Saúde &amp; bem-estar. A IA apoia o profissional: resume e alerta, não faz diagnóstico nem prescreve. Código aberto em <a href="https://github.com/infinityprocode/elo-saude">github.com/infinityprocode/elo-saude</a>.</p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  )
}
