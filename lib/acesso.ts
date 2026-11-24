import type { SupabaseClient } from '@supabase/supabase-js'

// Contas de demonstração são compartilhadas pelo júri: ativar 2 etapas nelas trancaria todo mundo.
export const ehContaDemo = (email?: string | null) => !!email && email.endsWith('.demo@elosaude.infinityprocode.com.br')

// Para onde a pessoa vai depois de entrar: profissional que atua em clínica → painel da clínica;
// autônomo → consultório; recepção → agenda da recepção; gestor → equipe; paciente/responsável → dossiê.
export async function destinoDe(sb: SupabaseClient, userId: string): Promise<string> {
  const { data: prof } = await sb.from('profissionais').select('id').eq('user_id', userId).maybeSingle()
  if (prof) {
    const { data: emOrg } = await sb.from('atuacoes').select('organizacao_id').eq('profissional_id', prof.id).not('organizacao_id', 'is', null).eq('ativo', true).limit(1)
    return emOrg?.length ? '/clinica' : '/consultorio'
  }
  const { data: equipe } = await sb.from('equipe_org').select('papel').eq('user_id', userId).eq('ativo', true).limit(1)
  if (equipe?.[0]?.papel === 'recepcao') return '/recepcao'
  if (equipe?.[0]?.papel === 'gestor') return '/clinica/equipe'
  return '/app'
}
