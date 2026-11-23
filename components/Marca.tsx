// Marca: dois elos que se encontram num ponto (o histórico ligando paciente e médicos).
export function Marca({ tamanho = 28 }: { tamanho?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em' }}>
      <svg width={tamanho} height={tamanho} viewBox="0 0 32 32" aria-hidden="true">
        <rect x="3" y="9" width="16" height="14" rx="7" fill="none" stroke="var(--accent)" strokeWidth="3" />
        <rect x="13" y="9" width="16" height="14" rx="7" fill="none" stroke="var(--good)" strokeWidth="3" />
        <circle cx="16" cy="16" r="2.6" fill="var(--ink)" />
      </svg>
      Elo Saúde
    </span>
  )
}
