import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { Bell, Search, Sparkles } from 'lucide-react'
import { Simbolo } from '@/components/Marca'
import s from './Moldura.module.css'

export type ItemNav = { k: string; href: string; rotulo: string; Icone: LucideIcon; badge?: number }
export type Usuario = { nome: string; papel: string; iniciais: string; foto?: string }

// Moldura do app no padrão aprovado (referência de 23/11): faixa azul com a ilustração, navegação em
// pílula no topo, painel claro que sobe sobre a faixa. No celular, a navegação vai para a barra inferior.
export function Moldura({ nav, ativo, usuario, alertas = 0, perguntar, faixa, abas, children }: {
  nav: ItemNav[]; ativo: string; usuario: Usuario; alertas?: number; perguntar?: string
  faixa: React.ReactNode; abas?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className={s.pagina}>
      <div className={s.moldura}>
        <div className={s.faixa}>
          <div className={s.arte} aria-hidden="true" />
          <header className={s.barra}>
            <Link href={nav[0].href} className={s.logo} aria-label="Elo Saúde, início"><Simbolo tamanho={40} /><span>Elo Saúde</span></Link>
            <nav className={s.pilula} aria-label="Menu principal">
              {nav.map(({ k, href, rotulo, Icone, badge }) => (
                <Link key={k} href={href} className={k === ativo ? s.on : ''} aria-current={k === ativo ? 'page' : undefined} title={rotulo}>
                  <Icone size={19} strokeWidth={1.8} aria-hidden="true" />
                  <span className={k === ativo ? '' : 'sr'}>{rotulo}</span>
                  {badge ? <em>{badge}</em> : null}
                </Link>
              ))}
            </nav>
            <div className={s.acoes}>
              <a href="#busca" className={s.redondo} aria-label="Buscar"><Search size={18} /></a>
              <span className={s.redondo} aria-label={`${alertas} alertas`}><Bell size={18} />{alertas > 0 && <i aria-hidden="true" />}</span>
              {perguntar && <a href={perguntar} className={s.perguntar}><Sparkles size={16} aria-hidden="true" />Pergunte ao Elo</a>}
              <form action="/sair" method="post">
                <button type="submit" className={s.avatar} aria-label={`${usuario.nome}, sair`} title={`${usuario.nome} · sair`}>
                  {usuario.foto ? <img src={usuario.foto} alt="" width={44} height={44} /> : usuario.iniciais}
                </button>
              </form>
            </div>
          </header>
          <div className={s.conteudoFaixa}>{faixa}</div>
          {abas && <div className={s.abas}>{abas}</div>}
        </div>
        <main className={s.painel} id="conteudo">{children}</main>
      </div>

      <nav className={s.inferior} aria-label="Navegação">
        {nav.slice(0, 5).map(({ k, href, rotulo, Icone, badge }) => (
          <Link key={k} href={href} className={k === ativo ? s.on : ''} aria-current={k === ativo ? 'page' : undefined}>
            <span className={s.ico}><Icone size={21} strokeWidth={1.9} aria-hidden="true" />{badge ? <em>{badge}</em> : null}</span>
            <span>{rotulo}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}

// Aba que "encaixa" no painel: a selecionada sobe e se liga a ele.
export function Aba({ on, href, Icone, titulo, sub, destaque }: { on?: boolean; href: string; Icone: LucideIcon; titulo: string; sub: string; destaque?: React.ReactNode }) {
  return (
    <Link href={href} className={`${s.aba} ${on ? s.abaOn : ''}`} aria-current={on ? 'true' : undefined} scroll={false}>
      <span className={s.abaIco}><Icone size={20} strokeWidth={1.8} aria-hidden="true" /></span>
      <span className={s.abaTxt}><strong>{titulo}</strong><small>{sub}</small></span>
      {on && destaque ? <span className={s.abaDestaque}>{destaque}</span> : null}
    </Link>
  )
}
