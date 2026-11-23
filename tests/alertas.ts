// Elo Saúde · teste das regras de alerta (sem banco): roda com `npx tsx tests/alertas.ts`.
import { mesmaHipotese } from '../lib/alertas'

const casos: [string, string, boolean][] = [
  ['Artrose do joelho', 'artrose do joelho direito', true],
  ['Infecção urinária', 'Infecção do trato urinário', true],
  ['Gestação de 9 semanas', 'Gestação de 14 semanas, sem intercorrências', true],
  ['Varicela (catapora)', 'Infecção urinária', false],
  ['Diabetes tipo 2 com controle parcial', 'Fibrilação atrial em acompanhamento', false],
]
let falhas = 0
for (const [a, b, esperado] of casos) {
  const r = mesmaHipotese(a, b)
  if (r !== esperado) falhas++
  console.log(`${r === esperado ? 'ok   ' : 'FALHA'}  "${a}" x "${b}" => ${r ? 'mesma hipótese' : 'diferentes'}`)
}
console.log(`\n${casos.length - falhas} de ${casos.length} casos`)
process.exit(falhas ? 1 : 0)
