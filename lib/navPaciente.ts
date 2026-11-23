import { FileScan, History, LayoutGrid, QrCode, ShieldCheck } from 'lucide-react'
import type { ItemNav } from '@/components/shell/Moldura'

export function navPaciente(id: string, pendentes = 0): ItemNav[] {
  const base = `/app/p/${id}`
  return [
    { k: 'resumo', href: base, rotulo: 'Meu dossiê', Icone: LayoutGrid },
    { k: 'documentos', href: `${base}/documentos`, rotulo: 'Documentos', curto: 'Docs', Icone: FileScan, badge: pendentes || undefined },
    { k: 'compartilhar', href: `${base}/compartilhar`, rotulo: 'Compartilhar', Icone: QrCode },
    { k: 'linha', href: `${base}#linha`, rotulo: 'Linha do tempo', curto: 'Histórico', Icone: History },
    { k: 'acessos', href: `${base}#acessos`, rotulo: 'Acessos', Icone: ShieldCheck },
  ]
}
