import { existsSync } from 'fs'
import { join } from 'path'

// Retratos FICTÍCIOS gerados por IA no estúdio da Infinity (pessoas que não existem). Crianças ficam só com iniciais.
// Só devolve o caminho se o arquivo existir (sem imagem quebrada); caso contrário, a tela usa as iniciais.
const R: Record<string, string> = {
  'Rosa Antunes': 'rosa', 'Camila Rocha': 'camila', 'Diego Ferraz': 'diego', 'José Almeida': 'jose', 'Helena Prates': 'helena',
  'Dra. Paula Nogueira': 'paula', 'Dra. Beatriz Lima': 'beatriz', 'Marina Souza': 'marina', 'Dr. Ricardo Alves': 'ricardo', 'Dr. Fernando Costa': 'fernando', 'Dra. Helena Martins': 'helena_dra',
}
export function retrato(nome: string): string | undefined {
  const k = R[nome]
  if (!k) return undefined
  return existsSync(join(process.cwd(), 'public', 'arte', 'retratos', `${k}.webp`)) ? `/arte/retratos/${k}.webp` : undefined
}
export const iniciais = (nome: string) => nome.replace(/^Dra?\.\s*/, '').split(' ').filter(Boolean).map((x) => x[0]).slice(0, 2).join('')
