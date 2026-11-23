import { CalendarDays, LayoutGrid, QrCode, Sparkles, Users } from 'lucide-react'
import type { ItemNav } from '@/components/shell/Moldura'

export function navConsultorio(alertas: number): ItemNav[] {
  return [
    { k: 'consultorio', href: '/consultorio', rotulo: 'Consultório', Icone: LayoutGrid },
    { k: 'pacientes', href: '/consultorio#pacientes', rotulo: 'Pacientes', Icone: Users, badge: alertas },
    { k: 'agenda', href: '/consultorio#agenda', rotulo: 'Agenda', Icone: CalendarDays },
    { k: 'receber', href: '/consultorio#receber', rotulo: 'Receber QR', curto: 'QR', Icone: QrCode },
    { k: 'assistente', href: '/consultorio#assistente', rotulo: 'Assistente', Icone: Sparkles },
  ]
}
